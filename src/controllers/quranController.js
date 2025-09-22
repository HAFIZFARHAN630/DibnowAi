const Quran = require("../models/Quran");

exports.getQuran = async (req, res) => {
  try {
    const verses = await Quran.find().limit(20);
    res.render("Quran/quran", { title: "Quran", verses });
  } catch (err) {
    res.status(500).send(err.message);
  }
};
