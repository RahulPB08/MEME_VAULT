import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion } from 'framer-motion';
import { FiUploadCloud, FiImage, FiTag, FiDollarSign, FiInfo, FiCheck } from 'react-icons/fi';
import { SiEthereum } from 'react-icons/si';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useWeb3 } from '../context/Web3Context';
import { ethers } from 'ethers';
import { resolveImageUrl, PLACEHOLDER_IMG } from '../utils/imageUtils';

const CATEGORIES = ['trending', 'dank', 'crypto', 'wholesome', 'classic', 'gaming', 'anime', 'politics', 'other'];

const STEPS = ['Upload Image', 'Add Details', 'Set Price', 'Mint NFT'];

const Create = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const { isConnected, mintNFT, account, getListingPrice, formatEth, contracts } = useWeb3();

  const [step, setStep] = useState(0);
  const [preview, setPreview] = useState(null);
  const [fileObj, setFileObj] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [minting, setMinting] = useState(false);
  const [listingFee, setListingFee] = useState('0.0015');
  const [form, setForm] = useState({
    name: '',
    description: '',
    category: 'dank',
    tags: '',
    price: '',
    royaltyPercent: 10,
  });
  const [ipfsImage, setIpfsImage] = useState('');
  const [metadataUri, setMetadataUri] = useState('');

  const onDrop = useCallback((accepted) => {
    const file = accepted[0];
    if (!file) return;
    setFileObj(file);
    setPreview(URL.createObjectURL(file));
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'] },
    maxSize: 50 * 1024 * 1024,
    multiple: false,
  });

  const handleForm = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const uploadImageToIPFS = async () => {
    if (!fileObj) { toast.error('Please select an image first'); return; }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', fileObj);
      const res = await axios.post('/api/upload/image', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${localStorage.getItem('mv_token')}`,
        },
      });

      const returnedUrl = res.data.ipfsUrl || '';

      // Detect mock/unconfigured Pinata: the backend returns a random fake CID
      // when PINATA_JWT is not set. These hashes never exist on IPFS.
      if (res.data.note && res.data.note.includes('Mock')) {
        toast('⚠️ Pinata not configured — using mock IPFS hash. Images will NOT persist after restart. Configure PINATA_JWT in backend/.env for real uploads.', {
          duration: 8000,
          icon: '⚠️',
          style: { background: '#7c3a0a', color: '#fde68a' },
        });
      } else {
        toast.success('Image uploaded to IPFS! 🚀');
      }

      setIpfsImage(returnedUrl);
      setStep(1); // advance to details step
    } catch (e) {
      toast.error(e.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const uploadMetadata = async () => {
    if (!form.name || !form.description) { toast.error('Please fill name & description'); return; }
    // Never use blob: URL as the stored image — it is ephemeral (dies on tab close).
    // Require the IPFS URL from the previous step.
    if (!ipfsImage) {
      toast.error('Please upload the image to IPFS first (go back to Step 1).');
      return;
    }
    setUploading(true);
    try {
      const res = await axios.post('/api/upload/metadata', {
        name: form.name,
        description: form.description,
        image: ipfsImage, // always use the real IPFS URL, never a blob:
        category: form.category,
        attributes: form.tags.split(',').filter(Boolean).map(t => ({ trait_type: 'tag', value: t.trim() })),
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('mv_token')}` },
      });
      setMetadataUri(res.data.metadataUri);
      toast.success('Metadata uploaded! ✨');
      setStep(2);

      // Fetch listing fee
      try {
        const fee = await getListingPrice();
        setListingFee(formatEth(fee));
      } catch {}
    } catch (e) {
      toast.error(e.response?.data?.message || 'Metadata upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleMint = async () => {
    if (!isConnected) { toast.error('Connect your wallet first!'); return; }
    if (!form.price || parseFloat(form.price) <= 0) { toast.error('Please set a valid price'); return; }

    setMinting(true);
    const toastId = toast.loading('Minting NFT on blockchain...', { duration: Infinity });

    try {
      const priceInWei = ethers.parseEther(form.price);
      const receipt = await mintNFT(metadataUri || `ipfs://mock-${Date.now()}`, priceInWei);

      // Extract tokenId from ERC721 Transfer event logs (mint = Transfer from 0x0)
      let extractedTokenId = null;
      if (receipt && receipt.logs) {
        for (const log of receipt.logs) {
          try {
            // ERC721 mint event: Transfer(from=0x0, to=minter, tokenId)
            if (
              log.topics[0] === ethers.id('Transfer(address,address,uint256)') &&
              log.topics[1] === '0x0000000000000000000000000000000000000000000000000000000000000000'
            ) {
              extractedTokenId = Number(BigInt(log.topics[3]));
              break;
            }
          } catch (e) {}
        }
      }

      // Fallback: ask the contract how many tokens exist — that's our new tokenId
      if (!extractedTokenId && contracts?.memeVault) {
        try {
          const total = await contracts.memeVault.getTotalMemes();
          extractedTokenId = Number(total);
        } catch (e) {}
      }

      // Save to database — NEVER use the blob: preview URL here.
      // ipfsImage holds the real Pinata/IPFS gateway URL.
      await axios.post('/api/nfts', {
        name: form.name,
        description: form.description,
        image: ipfsImage || '', // blob: URLs are ephemeral — omit if IPFS upload didn't happen
        ipfsHash: ipfsImage?.split('/ipfs/').pop() || '',
        metadataUri: metadataUri || '',
        price: priceInWei.toString(),
        priceInEth: form.price,
        category: form.category,
        tags: form.tags.split(',').filter(Boolean).map(t => t.trim()),
        tokenId: extractedTokenId,
        royaltyPercent: form.royaltyPercent,
        listed: true,
        transactionHash: receipt?.hash || '',
        creatorAddress: account || '',
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('mv_token')}` },
      });

      toast.dismiss(toastId);
      toast.success('NFT minted successfully! 🎉🚀');
      navigate('/dashboard');
    } catch (e) {
      toast.dismiss(toastId);
      // Blockchain tx failed — save as draft so user doesn't lose their work.
      // Still use ipfsImage (not blob) so the image survives a page reload.
      try {
        await axios.post('/api/nfts', {
          name: form.name,
          description: form.description,
          image: ipfsImage || '', // never blob: — always use the IPFS gateway URL
          ipfsHash: ipfsImage?.split('/ipfs/').pop() || '',
          metadataUri: metadataUri || '',
          price: ethers.parseEther(form.price).toString(),
          priceInEth: form.price,
          category: form.category,
          tags: form.tags.split(',').filter(Boolean).map(t => t.trim()),
          tokenId: null, // No tokenId — blockchain tx failed
          royaltyPercent: form.royaltyPercent,
          listed: false, // Not truly listed since chain tx failed
          creatorAddress: account || '',
        }, {
          headers: { Authorization: `Bearer ${localStorage.getItem('mv_token')}` },
        });
        toast.error('Blockchain transaction failed! NFT saved as draft. Please try reminting.', { duration: 6000 });
        navigate('/dashboard');
      } catch {
        toast.error(e.message || 'Minting failed');
      }
    } finally {
      setMinting(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="page-loader" style={{ paddingTop: '5rem' }}>
        <div style={{ textAlign: 'center', padding: '4rem' }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🔐</div>
          <h2>Sign In Required</h2>
          <p style={{ marginBottom: '1.5rem' }}>Please sign in to create NFTs</p>
          <a href="/login" className="btn btn-primary">Sign In</a>
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Create Meme NFT — MemeVault</title>
        <meta name="description" content="Mint your meme as an NFT on MemeVault." />
      </Helmet>

      <div style={{ paddingTop: '6rem', paddingBottom: '4rem' }}>
        <div className="container">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="create-header">
              <h1>Create Your <span className="gradient-text">Meme NFT</span></h1>
              <p>Upload your meme, add details, set a price, and mint to the blockchain.</p>
            </div>
          </motion.div>

          {/* Progress Steps */}
          <div className="create-steps">
            {STEPS.map((s, i) => (
              <div key={i} className={`create-step ${i === step ? 'active' : i < step ? 'done' : ''}`}>
                <div className="step-circle">
                  {i < step ? <FiCheck size={14} /> : i + 1}
                </div>
                <span className="step-label">{s}</span>
                {i < STEPS.length - 1 && <div className="step-line" />}
              </div>
            ))}
          </div>

          <div className="create-layout">
            {/* Left: Preview */}
            <div className="create-preview-col">
              <div className="preview-card">
                <div className="preview-label">Preview</div>
                {(ipfsImage || preview) ? (
                  <img
                    src={ipfsImage ? resolveImageUrl(ipfsImage) : preview}
                    alt="Preview"
                    className="preview-img"
                    onError={e => { e.target.src = PLACEHOLDER_IMG; }}
                  />
                ) : (
                  <div className="preview-placeholder">
                    <FiImage size={48} style={{ color: 'var(--text-muted)' }} />
                    <p>Your meme preview</p>
                  </div>
                )}
                {form.name && (
                  <div className="preview-info">
                    <p className="preview-name">{form.name}</p>
                    {form.price && (
                      <div className="price-tag">
                        <SiEthereum size={12} style={{ color: '#7c3aed' }} />
                        {form.price} ETH
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Listing Fee Info */}
              <div className="fee-card">
                <FiInfo size={16} style={{ color: 'var(--accent-secondary)', flexShrink: 0 }} />
                <div>
                  <p style={{ fontWeight: 600, fontSize: '0.85rem' }}>Platform Listing Fee</p>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {listingFee} ETH — paid once when minting
                  </p>
                </div>
              </div>
            </div>

            {/* Right: Form */}
            <div className="create-form-col">
              {/* Step 0: Upload */}
              {step === 0 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <h3 className="create-section-title"><FiUploadCloud /> Upload Your Meme</h3>
                  <div {...getRootProps()} className={`dropzone ${isDragActive ? 'drag-active' : ''}`}>
                    <input {...getInputProps()} />
                    <div className="dropzone-content">
                      <div className="dropzone-icon"><FiUploadCloud size={40} /></div>
                      {isDragActive ? (
                        <p>Drop it like it's hot! 🔥</p>
                      ) : (
                        <>
                          <p><strong>Drag & drop</strong> your meme here</p>
                          <p className="dropzone-sub">or click to browse</p>
                          <p className="dropzone-types">PNG, JPG, GIF, WEBP — Max 50MB</p>
                        </>
                      )}
                    </div>
                  </div>
                  {fileObj && (
                    <button className="btn btn-primary btn-lg" style={{ width: '100%', marginTop: '1rem' }} onClick={uploadImageToIPFS} disabled={uploading}>
                      {uploading ? 'Uploading to IPFS...' : 'Upload to IPFS →'}
                    </button>
                  )}
                </motion.div>
              )}

              {/* Step 1: Details */}
              {step === 1 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <h3 className="create-section-title"><FiTag /> Meme Details</h3>
                  <div className="input-group">
                    <label>Meme Name *</label>
                    <input className="input" name="name" placeholder="e.g. Doge to the Moon!" value={form.name} onChange={handleForm} />
                  </div>
                  <div className="input-group">
                    <label>Description *</label>
                    <textarea className="input" name="description" placeholder="Tell the story of your meme..." value={form.description} onChange={handleForm} rows={4} />
                  </div>
                  <div className="input-group">
                    <label>Category</label>
                    <select className="input" name="category" value={form.category} onChange={handleForm}>
                      {CATEGORIES.map(c => <option key={c} value={c} style={{ textTransform: 'capitalize' }}>{c}</option>)}
                    </select>
                  </div>
                  <div className="input-group">
                    <label>Tags (comma separated)</label>
                    <input className="input" name="tags" placeholder="doge, crypto, moon, funny" value={form.tags} onChange={handleForm} />
                  </div>
                  <div className="input-group">
                    <label>Royalty % (on resales)</label>
                    <input className="input" type="number" name="royaltyPercent" min={0} max={50} value={form.royaltyPercent} onChange={handleForm} />
                  </div>
                  <button className="btn btn-primary btn-lg" style={{ width: '100%' }} onClick={uploadMetadata} disabled={uploading || !form.name || !form.description}>
                    {uploading ? 'Saving Metadata...' : 'Save & Continue →'}
                  </button>
                  <button className="btn btn-ghost btn-sm" style={{ width: '100%', marginTop: '0.5rem' }} onClick={() => setStep(0)}>← Back</button>
                </motion.div>
              )}

              {/* Step 2: Price */}
              {step === 2 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <h3 className="create-section-title"><FiDollarSign /> Set Your Price</h3>
                  <div className="input-group">
                    <label>Price (ETH) *</label>
                    <div style={{ position: 'relative' }}>
                      <input
                        className="input"
                        type="number"
                        name="price"
                        placeholder="0.0"
                        step="0.001"
                        min="0"
                        value={form.price}
                        onChange={handleForm}
                        style={{ paddingLeft: '2.5rem' }}
                      />
                      <SiEthereum style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: '#7c3aed' }} />
                    </div>
                  </div>
                  {form.price && (
                    <div className="price-preview-card">
                      <div className="price-row"><span>Listing Price</span><span><SiEthereum size={12} /> {form.price} ETH</span></div>
                      <div className="price-row"><span>Platform Fee</span><span>{listingFee} ETH</span></div>
                      <div className="price-row price-row-total"><span>You'll receive</span><span className="gradient-text">~{Math.max(0, parseFloat(form.price || 0) - parseFloat(listingFee)).toFixed(4)} ETH</span></div>
                    </div>
                  )}
                  <button className="btn btn-primary btn-lg" style={{ width: '100%', marginTop: '1rem' }} onClick={() => setStep(3)} disabled={!form.price || parseFloat(form.price) <= 0}>
                    Continue to Mint →
                  </button>
                  <button className="btn btn-ghost btn-sm" style={{ width: '100%', marginTop: '0.5rem' }} onClick={() => setStep(1)}>← Back</button>
                </motion.div>
              )}

              {/* Step 3: Mint */}
              {step === 3 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <h3 className="create-section-title">🚀 Mint to Blockchain</h3>
                  <div className="mint-summary">
                    <div className="mint-row"><span>Meme Name</span><strong>{form.name}</strong></div>
                    <div className="mint-row"><span>Category</span><strong style={{ textTransform: 'capitalize' }}>{form.category}</strong></div>
                    <div className="mint-row"><span>Sale Price</span><strong>{form.price} ETH</strong></div>
                    <div className="mint-row"><span>Royalty</span><strong>{form.royaltyPercent}%</strong></div>
                    <div className="mint-row"><span>Listing Fee</span><strong>{listingFee} ETH</strong></div>
                    <div className="mint-row"><span>Wallet</span><strong style={{ fontSize: '0.8rem' }}>{account ? `${account.slice(0,8)}...${account.slice(-6)}` : 'Not connected'}</strong></div>
                  </div>

                  {!isConnected && (
                    <div className="alert alert-warning" style={{ marginBottom: '1rem' }}>
                      ⚠️ Please connect your wallet to mint on-chain.
                    </div>
                  )}

                  <button
                    className="btn btn-primary btn-xl"
                    style={{ width: '100%' }}
                    onClick={handleMint}
                    disabled={minting}
                  >
                    {minting ? '⏳ Minting...' : '🚀 Mint NFT Now'}
                  </button>
                  <button className="btn btn-ghost btn-sm" style={{ width: '100%', marginTop: '0.5rem' }} onClick={() => setStep(2)}>← Back</button>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .create-header { text-align: center; margin-bottom: 2.5rem; }
        .create-header h1 { margin-bottom: 0.5rem; }
        .create-steps {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0;
          margin-bottom: 3rem;
          flex-wrap: wrap;
          gap: 0.5rem;
        }
        .create-step {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .step-circle {
          width: 32px; height: 32px;
          border-radius: 50%;
          background: var(--bg-card);
          border: 2px solid var(--border-card);
          display: flex; align-items: center; justify-content: center;
          font-size: 0.8rem; font-weight: 700;
          color: var(--text-muted);
          transition: var(--transition-fast);
          flex-shrink: 0;
        }
        .create-step.active .step-circle {
          background: var(--gradient-primary);
          border-color: transparent;
          color: white;
          box-shadow: 0 0 20px rgba(124,58,237,0.4);
        }
        .create-step.done .step-circle {
          background: var(--accent-green);
          border-color: transparent;
          color: white;
        }
        .step-label {
          font-size: 0.8rem;
          font-weight: 600;
          color: var(--text-muted);
          white-space: nowrap;
        }
        .create-step.active .step-label { color: var(--accent-secondary); }
        .create-step.done .step-label { color: var(--accent-green); }
        .step-line {
          width: 40px; height: 2px;
          background: var(--border-secondary);
          margin: 0 0.5rem;
        }
        .create-layout {
          display: grid;
          grid-template-columns: 340px 1fr;
          gap: 2rem;
          align-items: start;
        }
        .preview-card {
          background: var(--bg-card);
          border: 1px solid var(--border-card);
          border-radius: var(--radius-xl);
          overflow: hidden;
          position: sticky;
          top: 6rem;
        }
        .preview-label {
          padding: 0.75rem 1rem;
          font-size: 0.75rem;
          font-weight: 700;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.1em;
          border-bottom: 1px solid var(--border-secondary);
        }
        .preview-img { width: 100%; aspect-ratio: 1; object-fit: cover; }
        .preview-placeholder {
          aspect-ratio: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
          background: var(--bg-secondary);
          color: var(--text-muted);
          font-size: 0.875rem;
        }
        .preview-info {
          padding: 1rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .preview-name { font-weight: 700; font-family: var(--font-secondary); }
        .fee-card {
          margin-top: 1rem;
          background: rgba(124,58,237,0.08);
          border: 1px solid rgba(124,58,237,0.2);
          border-radius: var(--radius-md);
          padding: 0.875rem 1rem;
          display: flex;
          gap: 0.75rem;
          align-items: flex-start;
        }
        .create-form-col {
          background: var(--bg-card);
          border: 1px solid var(--border-card);
          border-radius: var(--radius-xl);
          padding: 2rem;
        }
        .create-section-title {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 1.1rem;
          margin-bottom: 1.5rem;
          color: var(--text-primary);
        }
        .dropzone {
          border: 2px dashed var(--border-primary);
          border-radius: var(--radius-lg);
          padding: 3rem 2rem;
          text-align: center;
          cursor: pointer;
          transition: var(--transition-base);
          background: rgba(124,58,237,0.03);
        }
        .dropzone:hover, .dropzone.drag-active {
          border-color: var(--accent-secondary);
          background: rgba(124,58,237,0.08);
        }
        .dropzone-icon {
          margin: 0 auto 1rem;
          color: var(--accent-secondary);
        }
        .dropzone-content p { color: var(--text-secondary); font-size: 0.95rem; }
        .dropzone-content strong { color: var(--text-primary); }
        .dropzone-sub { color: var(--text-muted) !important; font-size: 0.85rem !important; }
        .dropzone-types { margin-top: 0.75rem; font-size: 0.75rem !important; color: var(--text-muted) !important; }
        .price-preview-card {
          background: var(--bg-secondary);
          border: 1px solid var(--border-secondary);
          border-radius: var(--radius-md);
          padding: 1rem;
        }
        .price-row {
          display: flex;
          justify-content: space-between;
          font-size: 0.875rem;
          padding: 0.4rem 0;
          color: var(--text-secondary);
        }
        .price-row span:last-child {
          display: flex; align-items: center; gap: 0.25rem;
          font-weight: 600; color: var(--text-primary);
        }
        .price-row-total {
          border-top: 1px solid var(--border-secondary);
          padding-top: 0.75rem;
          margin-top: 0.25rem;
          font-weight: 700;
        }
        .mint-summary {
          background: var(--bg-secondary);
          border-radius: var(--radius-lg);
          border: 1px solid var(--border-secondary);
          overflow: hidden;
          margin-bottom: 1.5rem;
        }
        .mint-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.875rem 1rem;
          font-size: 0.875rem;
          border-bottom: 1px solid var(--border-secondary);
          color: var(--text-secondary);
        }
        .mint-row:last-child { border-bottom: none; }
        .mint-row strong { color: var(--text-primary); font-weight: 600; }
        .alert { padding: 0.875rem 1rem; border-radius: var(--radius-md); font-size: 0.875rem; }
        .alert-warning { background: rgba(245,158,11,0.1); border: 1px solid rgba(245,158,11,0.3); color: var(--accent-gold); }
        @media (max-width: 1024px) {
          .create-layout { grid-template-columns: 1fr; }
          .preview-card { position: static; }
        }
      `}</style>
    </>
  );
};

export default Create;
