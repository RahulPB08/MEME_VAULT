import multer from 'multer';
import axios from 'axios';
import FormData from 'form-data';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, GIF, WEBP allowed.'));
    }
  },
});

// @desc    Upload image to Pinata IPFS
// @route   POST /api/upload/image
export const uploadImage = [
  upload.single('file'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, message: 'No file uploaded' });
      }

      const pinataJWT = process.env.PINATA_JWT;

      // When Pinata is unconfigured the JWT equals the placeholder string.
      // Return a clearly-named mock response so the frontend can warn the user.
      if (!pinataJWT || pinataJWT === 'your_pinata_jwt') {
        // Use a stable, predictable hash so the frontend resolver shows the
        // placeholder image instead of trying broken random IPFS hashes.
        const mockHash = 'QmMOCK_PINATA_NOT_CONFIGURED';
        return res.json({
          success: true,
          ipfsHash: mockHash,
          ipfsUrl: `https://gateway.pinata.cloud/ipfs/${mockHash}`,
          fileName: req.file.originalname,
          note: 'Mock IPFS hash (configure Pinata for real uploads)',
        });
      }

      const formData = new FormData();
      formData.append('file', req.file.buffer, {
        filename: req.file.originalname,
        contentType: req.file.mimetype,
      });

      const response = await axios.post('https://api.pinata.cloud/pinning/pinFileToIPFS', formData, {
        headers: {
          Authorization: `Bearer ${pinataJWT}`,
          ...formData.getHeaders(),
        },
        maxBodyLength: Infinity,
      });

      const ipfsHash = response.data.IpfsHash;
      res.json({
        success: true,
        ipfsHash,
        ipfsUrl: `https://gateway.pinata.cloud/ipfs/${ipfsHash}`,
        fileName: req.file.originalname,
      });
    } catch (error) {
      console.error('Upload error:', error.message);
      res.status(500).json({ success: false, message: 'Upload failed: ' + error.message });
    }
  },
];

// @desc    Upload JSON metadata to Pinata
// @route   POST /api/upload/metadata
export const uploadMetadata = async (req, res) => {
  try {
    const { name, description, image, attributes, category } = req.body;

    const metadata = {
      name,
      description,
      image,
      attributes: attributes || [],
      category,
      external_url: 'https://memevault.io',
      created_by: 'MemeVault',
    };

    const pinataJWT = process.env.PINATA_JWT;

    if (!pinataJWT || pinataJWT === 'your_pinata_jwt') {
      const mockHash = 'QmMOCK_PINATA_NOT_CONFIGURED';
      return res.json({
        success: true,
        ipfsHash: mockHash,
        metadataUri: `ipfs://${mockHash}`,
        metadata,
        note: 'Mock metadata hash (configure Pinata for real uploads)',
      });
    }

    const response = await axios.post(
      'https://api.pinata.cloud/pinning/pinJSONToIPFS',
      { pinataContent: metadata, pinataMetadata: { name: `${name}-metadata` } },
      {
        headers: {
          Authorization: `Bearer ${pinataJWT}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const ipfsHash = response.data.IpfsHash;
    res.json({
      success: true,
      ipfsHash,
      metadataUri: `ipfs://${ipfsHash}`,
      metadata,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Metadata upload failed: ' + error.message });
  }
};
