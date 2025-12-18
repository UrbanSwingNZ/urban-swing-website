/**
 * merch-order-notification.js
 * Email template for merchandise order confirmations
 */

/**
 * Generate merchandise order confirmation email
 * @param {Object} order - Order data from merchOrders collection
 * @param {string} orderId - Order document ID
 * @returns {Object} Object with subject, html and text versions
 */
function generateMerchOrderEmail(order, orderId) {
  // Product name mapping
  const productNames = {
    'maliTee': 'Mali Tee',
    'cropTee': 'Crop Tee',
    'stapleTee': 'Staple Tee',
    'womensZipHood': "Women's Relax Zip Hood",
    'mensZipHood': "Men's Relax Zip Hood",
    'womensCrew': "Women's Relax Crew",
    'mensCrew': "Men's Relax Crew"
  };

  // Format items list
  const items = order.items || {};
  const itemsList = Object.entries(items).map(([key, item]) => {
    return {
      name: item.productName || productNames[key] || key,
      size: item.size || 'N/A',
      quantity: item.quantity || 0
    };
  });

  // Build HTML items list
  const itemsHtml = itemsList.map(item => 
    `<li style="margin-bottom: 8px;">${item.name} - Size: ${item.size} - Quantity: ${item.quantity}</li>`
  ).join('');

  // Build text items list
  const itemsText = itemsList.map(item => 
    `  - ${item.name} - Size: ${item.size} - Quantity: ${item.quantity}`
  ).join('\n');

  // Shipping method display
  const shippingLabels = {
    'courier': 'Courier Delivery',
    'collect-urban-swing': 'Collect from Urban Swing',
    'collect-event': 'Collect at Event'
  };
  const shippingMethod = shippingLabels[order.shipping] || order.shipping;

  // Conditional shipping address/pickup info
  let shippingInfoHtml = '';
  let shippingInfoText = '';

  if (order.shipping === 'courier') {
    shippingInfoHtml = `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Shipping Address:</strong></td>
        <td style="padding: 10px; border-bottom: 1px solid #ddd;">${order.address || 'N/A'}</td>
      </tr>
    `;
    shippingInfoText = `Shipping Address: ${order.address || 'N/A'}`;
  } else if (order.shipping === 'collect-event' && order.eventName) {
    shippingInfoHtml = `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Pickup Location:</strong></td>
        <td style="padding: 10px; border-bottom: 1px solid #ddd;">Customer will collect at ${order.eventName}</td>
      </tr>
    `;
    shippingInfoText = `Pickup Location: Customer will collect at ${order.eventName}`;
  }

  // Additional notes section
  const notesHtml = order.additionalNotes ? `
    <div style="margin-top: 20px; padding: 15px; background: #fff3cd; border-left: 4px solid #ffc107; border-radius: 4px;">
      <strong style="color: #856404;">Additional Notes:</strong><br>
      <span style="color: #856404;">${order.additionalNotes}</span>
    </div>
  ` : '';

  const notesText = order.additionalNotes ? `\nAdditional Notes:\n${order.additionalNotes}` : '';

  // Chosen name section
  const chosenNameHtml = order.chosenName ? `
    <tr>
      <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Custom Name:</strong></td>
      <td style="padding: 10px; border-bottom: 1px solid #ddd;">${order.chosenName}</td>
    </tr>
  ` : '';

  const chosenNameText = order.chosenName ? `Custom Name: ${order.chosenName}` : '';

  // Format order date
  const orderDate = new Date().toLocaleDateString('en-NZ', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #3534Fa 0%, #9a16f5 50%, #e800f2 100%); padding: 30px; text-align: center;">
        <h1 style="color: white; margin: 0 0 10px 0;">Urban Swing</h1>
        <p style="color: white; margin: 0; font-size: 1.1rem;">Merchandise Order Received</p>
      </div>
      
      <div style="padding: 30px; background: #fff;">
        <h2 style="color: #9a16f5; margin-top: 0;">Hi there! 👋</h2>
        
        <p style="font-size: 1rem; line-height: 1.6; color: #333;">
          We've received a new merchandise order from <strong>${order.fullName}</strong>!
        </p>

        <h3 style="color: #9a16f5; margin-top: 30px;">📋 Order Details</h3>
        
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Order ID:</strong></td>
            <td style="padding: 10px; border-bottom: 1px solid #ddd;"><code style="background: #f8f9fa; padding: 2px 6px; border-radius: 3px;">${orderId}</code></td>
          </tr>
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Order Date:</strong></td>
            <td style="padding: 10px; border-bottom: 1px solid #ddd;">${orderDate}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Customer Name:</strong></td>
            <td style="padding: 10px; border-bottom: 1px solid #ddd;">${order.fullName}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Email:</strong></td>
            <td style="padding: 10px; border-bottom: 1px solid #ddd;"><a href="mailto:${order.email}" style="color: #9a16f5;">${order.email}</a></td>
          </tr>
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Phone:</strong></td>
            <td style="padding: 10px; border-bottom: 1px solid #ddd;">${order.phoneNumber || 'N/A'}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Shipping Method:</strong></td>
            <td style="padding: 10px; border-bottom: 1px solid #ddd;">${shippingMethod}</td>
          </tr>
          ${shippingInfoHtml}
          ${chosenNameHtml}
        </table>

        <h3 style="color: #9a16f5; margin-top: 30px;">📦 Items Ordered</h3>
        
        <ul style="list-style: none; padding: 0; margin: 0;">
          ${itemsHtml}
        </ul>

        ${notesHtml}

        <div style="margin-top: 30px; text-align: center;">
          <p style="color: #666;">Manage this order in the admin panel:</p>
          <a href="https://urbanswing.co.nz/admin/admin-tools/merch-orders/" 
             style="display: inline-block; padding: 12px 24px; background: #9a16f5; color: white; text-decoration: none; border-radius: 6px;">
            Open Merchandise Orders
          </a>
        </div>
      </div>
      
      <div style="padding: 20px; text-align: center; background: #f8f9fa; border-top: 1px solid #e0e0e0;">
        <p style="margin: 0 0 15px 0; font-size: 0.9rem; color: #666;">Follow us for updates and events:</p>
        
        <div style="margin-bottom: 15px;">
          <a href="https://www.facebook.com/UrbanSwingNZ" style="display: inline-block; margin: 0 8px;" target="_blank" rel="noopener">
            <img src="https://cdn-icons-png.flaticon.com/512/733/733547.png" alt="Facebook" style="width: 32px; height: 32px; vertical-align: middle;">
          </a>
          <a href="https://www.instagram.com/urbanswingnz" style="display: inline-block; margin: 0 8px;" target="_blank" rel="noopener">
            <img src="https://cdn-icons-png.flaticon.com/512/2111/2111463.png" alt="Instagram" style="width: 32px; height: 32px; vertical-align: middle;">
          </a>
          <a href="https://urbanswing.co.nz" style="display: inline-block; margin: 0 8px;" target="_blank" rel="noopener">
            <img src="https://cdn-icons-png.flaticon.com/512/1006/1006771.png" alt="Website" style="width: 32px; height: 32px; vertical-align: middle;">
          </a>
          <a href="mailto:dance@urbanswing.co.nz" style="display: inline-block; margin: 0 8px;">
            <img src="https://cdn-icons-png.flaticon.com/512/732/732200.png" alt="Email" style="width: 32px; height: 32px; vertical-align: middle;">
          </a>
        </div>
        
        <p style="margin: 0; font-size: 0.85rem; color: #999;">
          This is an automated notification from Urban Swing merchandise order system.
        </p>
      </div>
    </div>
  `;

  const text = `
URBAN SWING - Merchandise Order Received

Hi there!

We've received a new merchandise order from ${order.fullName}!

Order Details:
--------------
Order ID: ${orderId}
Order Date: ${orderDate}
Customer Name: ${order.fullName}
Email: ${order.email}
Phone: ${order.phoneNumber || 'N/A'}
Shipping Method: ${shippingMethod}
${shippingInfoText}
${chosenNameText}

Items Ordered:
--------------
${itemsText}
${notesText}

Manage this order: https://urbanswing.co.nz/admin/admin-tools/merch-orders/

---
Follow us:
Facebook: https://www.facebook.com/UrbanSwingNZ
Instagram: https://www.instagram.com/urbanswingnz
Website: https://urbanswing.co.nz
Email: dance@urbanswing.co.nz

This is an automated notification from Urban Swing merchandise order system.
  `;

  return {
    subject: `New Merchandise Order from ${order.fullName}`,
    html,
    text
  };
}

module.exports = {
  generateMerchOrderEmail
};
