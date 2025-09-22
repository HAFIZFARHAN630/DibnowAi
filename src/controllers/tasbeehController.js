const Tasbeeh = require("../models/Tasbeeh");

exports.getTasbeeh = async (req, res) => {
  try {
    const list = await Tasbeeh.find();
    res.render("Tasbeeh/tasbeeh", { title: "Tasbeeh Counter", list });
  } catch (err) {
    res.status(500).send(err.message);
  }
};