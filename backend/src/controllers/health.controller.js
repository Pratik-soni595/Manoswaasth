exports.healthCheck = (req, res) => {
  res.status(200).json({
    ok: true,
    message: 'API is healthy',
  });
};
