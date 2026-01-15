import { Router } from "express";
import axios from "axios";

const router = Router();

/**
 * Get directions from origin to destination
 * Uses Google Directions API
 */
router.get("/", async (req, res) => {
  const origin = req.query.origin as string;
  const destination = req.query.destination as string;

  if (!origin || !destination) {
    return res.status(400).json({
      error: "origin and destination required (format: lat,lng)"
    });
  }

  try {
    const response = await axios.get(
      "https://maps.googleapis.com/maps/api/directions/json",
      {
        params: {
          origin,
          destination,
          key: process.env.GOOGLE_MAPS_API_KEY
        }
      }
    );

    if (response.data.status !== "OK") {
      return res.status(400).json({
        error: response.data.status,
        message: response.data.error_message || "Directions not available"
      });
    }

    const route = response.data.routes[0];
    if (!route) {
      return res.status(404).json({
        error: "No route found"
      });
    }

    // Extract polyline points
    const leg = route.legs[0];
    const polyline = route.overview_polyline.points;
    
    // Decode polyline to get coordinates
    const coordinates = decodePolyline(polyline);

    res.json({
      distance: leg.distance.text,
      duration: leg.duration.text,
      startAddress: leg.start_address,
      endAddress: leg.end_address,
      coordinates,
      steps: leg.steps.map((step: any) => ({
        instruction: step.html_instructions,
        distance: step.distance.text,
        duration: step.duration.text
      }))
    });
  } catch (error: any) {
    console.error("Directions API error:", error);
    res.status(500).json({
      error: "Failed to get directions",
      message: error.message
    });
  }
});

/**
 * Decode Google polyline string to coordinates
 */
function decodePolyline(encoded: string): Array<[number, number]> {
  const coordinates: Array<[number, number]> = [];
  let index = 0;
  const len = encoded.length;
  let lat = 0;
  let lng = 0;

  while (index < len) {
    let shift = 0;
    let result = 0;
    let byte: number;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const deltaLat = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lat += deltaLat;

    shift = 0;
    result = 0;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const deltaLng = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lng += deltaLng;

    coordinates.push([lat / 1e5, lng / 1e5]);
  }

  return coordinates;
}

export default router;
