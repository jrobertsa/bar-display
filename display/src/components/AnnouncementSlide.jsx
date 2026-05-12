export default function AnnouncementSlide({ slide }) {
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', background: '#0a0a0a', textAlign: 'center', padding: 48 }}>
      {slide.image_path && (
        <img
          src={`${import.meta.env.VITE_API_URL}${slide.image_path}`}
          alt=""
          style={{ maxHeight: '45vh', maxWidth: '80%', objectFit: 'contain', marginBottom: 32, borderRadius: 12 }}
        />
      )}
      {slide.title && <div className="slide-title">{slide.title}</div>}
    </div>
  );
}
