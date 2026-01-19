import { useEffect, useState, useRef } from "react";
import { fetchPlaceDetails } from "./api";

type PlaceDetails = {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  website: string | null;
  photos: string[];
  openingStatus: "open" | "closed" | "unknown";
  latitude: number;
  longitude: number;
  category: string;
  source: "db" | "api";
};

type PlaceDetailsCardProps = {
  placeId: string;
  onClose: () => void;
  onViewOnMap: () => void;
};

export default function PlaceDetailsCard({
  placeId,
  onClose,
  onViewOnMap
}: PlaceDetailsCardProps) {
  const [details, setDetails] = useState<PlaceDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Reset state when placeId changes
    setDetails(null);
    setLoading(true);
    setError(null);
    setCurrentPhotoIndex(0);

    // Fetch place details
    fetchPlaceDetails(placeId)
      .then((data) => {
        setDetails(data);
        setError(null);
      })
      .catch((err) => {
        console.error("Failed to fetch place details:", err);
        setError("Failed to load place details");
        setDetails(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [placeId]);

  // Handle ESC key to close
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  // Prevent clicks inside card from closing it
  const handleCardClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  if (loading) {
    return (
      <div className="place-details-card loading" ref={cardRef} onClick={handleCardClick}>
        <div className="place-details-header">
          <div className="skeleton-text" style={{ width: "60%", height: "20px" }}></div>
          <button className="close-btn" onClick={onClose} aria-label="Close">×</button>
        </div>
        <div className="place-details-body">
          <div className="skeleton-image" style={{ width: "100%", height: "200px" }}></div>
          <div className="skeleton-text" style={{ width: "80%", height: "16px", marginTop: "12px" }}></div>
          <div className="skeleton-text" style={{ width: "60%", height: "16px", marginTop: "8px" }}></div>
        </div>
      </div>
    );
  }

  if (error || !details) {
    return (
      <div className="place-details-card error" ref={cardRef} onClick={handleCardClick}>
        <div className="place-details-header">
          <span>Error</span>
          <button className="close-btn" onClick={onClose} aria-label="Close">×</button>
        </div>
        <div className="place-details-body">
          <p>{error || "Place details not available"}</p>
        </div>
      </div>
    );
  }

  const getStatusColor = () => {
    switch (details.openingStatus) {
      case "open":
        return "#10b981"; // green
      case "closed":
        return "#ef4444"; // red
      default:
        return "#6b7280"; // gray
    }
  };

  const getStatusText = () => {
    switch (details.openingStatus) {
      case "open":
        return "Open";
      case "closed":
        return "Closed";
      default:
        return "Unknown";
    }
  };

  const formatCategory = (slug: string) => {
    return slug
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  return (
    <div className="place-details-card" ref={cardRef} onClick={handleCardClick}>
      {/* Header */}
      <div className="place-details-header">
        <div className="place-details-title-section">
          <h3 className="place-details-name">{details.name}</h3>
          <span className="place-details-category">{formatCategory(details.category)}</span>
        </div>
        <button className="close-btn" onClick={onClose} aria-label="Close">×</button>
      </div>

      {/* Body */}
      <div className="place-details-body">
        {/* Photo Carousel */}
        {details.photos && details.photos.length > 0 && (
          <div className="photo-carousel">
            <div className="photo-carousel-container">
              {details.photos.map((photo, index) => (
                <img
                  key={index}
                  src={photo}
                  alt={`${details.name} - Photo ${index + 1}`}
                  className={`photo-carousel-image ${index === currentPhotoIndex ? "active" : ""}`}
                  onClick={() => setCurrentPhotoIndex(index)}
                />
              ))}
            </div>
            {details.photos.length > 1 && (
              <div className="photo-carousel-indicators">
                {details.photos.map((_, index) => (
                  <button
                    key={index}
                    className={`photo-indicator ${index === currentPhotoIndex ? "active" : ""}`}
                    onClick={() => setCurrentPhotoIndex(index)}
                    aria-label={`View photo ${index + 1}`}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Address */}
        {details.address && (
          <div className="place-details-field">
            <span className="field-label">📍 Address</span>
            <span className="field-value">{details.address}</span>
          </div>
        )}

        {/* Opening Status */}
        <div className="place-details-field">
          <span className="field-label">Status</span>
          <span
            className="opening-status"
            style={{ color: getStatusColor() }}
          >
            {getStatusText()}
          </span>
        </div>

        {/* Phone */}
        {details.phone && (
          <div className="place-details-field">
            <span className="field-label">📞 Phone</span>
            <a href={`tel:${details.phone}`} className="field-value link">
              {details.phone}
            </a>
          </div>
        )}

        {/* Website */}
        {details.website && (
          <div className="place-details-field">
            <span className="field-label">🌐 Website</span>
            <a
              href={details.website}
              target="_blank"
              rel="noopener noreferrer"
              className="field-value link"
            >
              Visit Website
            </a>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="place-details-footer">
        <button className="view-on-map-btn" onClick={onViewOnMap}>
          View on Map
        </button>
        <button className="directions-btn-placeholder" disabled>
          Directions (Coming Soon)
        </button>
      </div>
    </div>
  );
}
