
import express from "express";
import multer from "multer";
import sharp from "sharp";
import { pipeline } from "@huggingface/transformers";

const app = express();

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type"
  );

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  next();
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Please upload an image"));
    }
  }
});

let removerPromise;

function getRemover() {
  if (!removerPromise) {
    removerPromise = pipeline(
      "background-removal",
      "Xenova/modnet"
    ).catch((error) => {
      removerPromise = null;
      throw error;
    });
  }

  return removerPromise;
}

app.get("/", (req, res) => {
  res.json({
    status: "online",
    message: "Bixelr AI server is running"
  });
});

app.post(
  "/remove-background",
  upload.single("image"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          error: "Please upload an image in the image field"
        });
      }

      const input = await sharp(req.file.buffer)
        .rotate()
        .jpeg()
        .toBuffer();

      const dataUrl =
        "data:image/jpeg;base64," +
        input.toString("base64");

      const remover = await getRemover();
      const result = await remover(dataUrl);
      const output = Array.isArray(result)
        ? result[0]
        : result;

      if (
        !output ||
        !output.data ||
        !output.width ||
        !output.height
      ) {
        throw new Error("The AI returned no usable image");
      }

      const png = await sharp(
        Buffer.from(output.data),
        {
          raw: {
            width: output.width,
            height: output.height,
            channels: 4
          }
        }
      )
        .png()
        .toBuffer();

      res.setHeader("Content-Type", "image/png");
      res.setHeader(
        "Content-Disposition",
        'inline; filename="bixelr-cutout.png"'
      );

      res.send(png);
    } catch (error) {
      console.error("Background removal failed:", error);

      res.status(500).json({
        error: "Background removal failed",
        message: error.message
      });
    }
  }
);

const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
  console.log("Bixelr AI server started");
});
