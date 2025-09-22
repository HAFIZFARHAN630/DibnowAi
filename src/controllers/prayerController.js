const Prayer = require("../models/Prayer");

exports.getPrayers = async (req, res) => {
  try {
    const prayers = await Prayer.find();
    res.render("Prayer/prayer", { title: "Prayer Times", prayers });
  } catch (err) {
    res.status(500).send(err.message);
  }
};

