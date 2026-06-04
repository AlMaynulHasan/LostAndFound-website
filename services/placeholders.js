/**
 * Get placeholder SVG for category
 */
function getCategoryIcon(category) {
  const icons = {
    'Phone': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><path d="M12 18h.01"/></svg>',
    'Wallet': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="14" rx="2" ry="2"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><circle cx="17" cy="16" r="1"/></svg>',
    'Bag': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="8" width="14" height="13" rx="2"/><path d="M7 8V6c0-1.1.9-2 2-2h2c1.1 0 2 .9 2 2v2m0 0V6c0-1.1.9-2 2-2h2c1.1 0 2 .9 2 2v2"/></svg>',
    'ID Card': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="5" width="20" height="14" rx="2"/><circle cx="7" cy="10" r="2.5"/><path d="M4.5 15.5h5"/><path d="M14 10h6m-6 3h6m-6 3h4"/></svg>',
    'Keys': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="7" cy="11" r="3"/><path d="M10.2 10h11.8m-15 4h17"/></svg>',
    'Electronics': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="2" width="18" height="14" rx="2"/><line x1="7" y1="18" x2="17" y2="18"/><line x1="9" y1="22" x2="15" y2="22"/></svg>',
    'Books': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>',
    'Clothing': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 4h12v6H6z"/><path d="M9 10v8l3 2 3-2v-8"/><path d="M6 22h12"/></svg>',
    'Other': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6m0 0v0"/><path d="M9 12h6"/></svg>'
  };
  
  return icons[category] || icons['Other'];
}

/**
 * Get placeholder HTML for items without images
 */
function getPlaceholderHTML(category, itemName) {
  const icon = getCategoryIcon(category);
  return `
    <div class="placeholder-image" style="
      width: 100%;
      aspect-ratio: 1;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      position: relative;
      overflow: hidden;
    ">
      <div style="text-align: center; color: white; opacity: 0.9;">
        <div style="font-size: 48px; margin-bottom: 10px;">
          ${icon}
        </div>
        <div style="font-size: 12px; font-weight: 500; text-transform: uppercase; letter-spacing: 1px;">
          ${category || 'Item'}
        </div>
      </div>
    </div>
  `;
}

module.exports = {
  getCategoryIcon,
  getPlaceholderHTML
};
