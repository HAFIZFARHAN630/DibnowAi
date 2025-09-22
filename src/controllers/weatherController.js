const Weather = require("../models/Weather");

exports.getWeather = async (req, res) => {
  try {
    const data = await Weather.find();
    res.render("Weather app/weather", { title: "Weather", data });
  } catch (err) {
    res.status(500).send(err.message);
  }
};

