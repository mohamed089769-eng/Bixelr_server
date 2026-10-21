
const express = require("express");
const app = express();

app.get("/", (req, res) => {
  res.json({
    status: "online",
    message: "Bixelr server is working!"
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
  console.log("Bixelr server started");
});
