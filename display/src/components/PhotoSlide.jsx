export default function PhotoSlide({ slide }) {
  return (
    <div
      className="slide-photo"
      style={{ backgroundImage: `url(${import.meta.env.VITE_API_URL}${slide.image_path})` }}
    >
      <div className="overlay" />
      {slide.title && (
        <div style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
          <div className="slide-title">{slide.title}</div>
        </div>
      )}
    </div>
  );
}
