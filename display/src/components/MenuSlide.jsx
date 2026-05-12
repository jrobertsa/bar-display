const FoodIcon = ({ color }) => (
  <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.55 }}>
    <line x1="5" y1="2" x2="5" y2="22" />
    <path d="M3 2v5c0 1.1.9 2 2 2s2-.9 2-2V2" />
    <path d="M15 2c0 0 2 2.5 2 7v1h-2" />
    <line x1="15" y1="10" x2="15" y2="22" />
  </svg>
);

const DrinkIcon = ({ color }) => (
  <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.55 }}>
    <line x1="12" y1="13" x2="12" y2="21" />
    <line x1="8" y1="21" x2="16" y2="21" />
    <path d="M4 3h16l-8 10L4 3z" />
    <line x1="4" y1="3" x2="20" y2="3" />
  </svg>
);

export default function MenuSlide({ title, items, type = 'food', accentColor = '#f0c040' }) {
  const PlaceholderIcon = type === 'drinks' ? DrinkIcon : FoodIcon;
  const categories = [...new Set(items.map(i => i.category || 'Menu'))].sort();

  return (
    <div className="slide-menu">
      <div className="menu-slide-header">
        <div className="menu-slide-accent-line" style={{ background: accentColor }} />
        <h1 className="menu-slide-title">{title}</h1>
        <div className="menu-slide-accent-line" style={{ background: accentColor }} />
      </div>

      <div className="menu-slide-body">
        {categories.map(cat => (
          <div key={cat} className="menu-slide-section">
            {categories.length > 1 && (
              <div className="menu-slide-category-label" style={{ color: accentColor }}>
                {cat}
              </div>
            )}
            <div className="menu-grid">
              {items
                .filter(i => (i.category || 'Menu') === cat)
                .map(item => (
                  <div className="menu-item" key={item.id}>
                    {item.image_path ? (
                      <img
                        className="menu-item-image"
                        src={`${import.meta.env.VITE_API_URL}${item.image_path}`}
                        alt={item.name}
                      />
                    ) : (
                      <div className="menu-item-image-placeholder">
                        <PlaceholderIcon color={accentColor} />
                      </div>
                    )}
                    <div className="menu-item-info">
                      <div className="menu-item-name">{item.name}</div>
                      {item.description && (
                        <div className="menu-item-desc">{item.description}</div>
                      )}
                    </div>
                    {item.price != null && (
                      <div className="menu-item-price" style={{ color: accentColor }}>
                        ${Number(item.price).toFixed(2)}
                      </div>
                    )}
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
