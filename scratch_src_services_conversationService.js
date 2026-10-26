    healthcareDetails: p.healthcareDetails || null,
      // Recognize the demo balm name in both English and Kannada transliteration.
      const mentionsMenthoBalm = /mentho\s*plus|mentho|ಮೆಂತೋ|ಮೆಂಥೋ|ಬಾಮ್/i.test(text);
      product = (mentionsMenthoBalm ? db.getProductById('MED-BALM-001') : null)
    // Healthcare product questions: only use the explicit dataset fields and never invent medical claims.
    if (product?.healthcareDetails) {
      const h = product.healthcareDetails;
      const isKannada = /[\u0C80-\u0CFF]/.test(text) || /\b(kannada|ಕನ್ನಡ)\b/i.test(text);
      let healthcareAnswer = null;
      if (isKannada && /ಬೆಲೆ|ದರ|ಎಷ್ಟು ರೂ|ರಿಯಾಯಿತಿ|ಡಿಸ್ಕೌಂಟ್|ಆಫರ್/i.test(text)) {
        healthcareAnswer = `ಡೆಮೊ ಮಾರಾಟದ ಬೆಲೆ ₹${product.salePrice}. ಮಾದರಿ ಎಂಆರ್‌ಪಿ ₹${product.price}; ಮಾದರಿ ರಿಯಾಯಿತಿ ₹${product.price - product.salePrice}.`;
      } else if (isKannada && /ಸ್ಟಾಕ್|ಲಭ್ಯ|ಎಷ್ಟು ಪೀಸ್|ಎಷ್ಟು ಯೂನಿಟ್/i.test(text)) {
        healthcareAnswer = quantity > 0 ? `ಡೆಮೊ ಇನ್ವೆಂಟರಿಯಲ್ಲಿ ${quantity} ಯೂನಿಟ್‌ಗಳು ಲಭ್ಯವಿವೆ.` : `ಈ ಉತ್ಪನ್ನವು ಡೆಮೊದಲ್ಲಿ ಪ್ರಸ್ತುತ ಸ್ಟಾಕ್‌ನಲ್ಲಿ ಇಲ್ಲ.`;
      } else if (isKannada && /ಡೆಲಿವರಿ|ತಲುಪಲು|ಎಷ್ಟು ದಿನ|ಮನೆಗೆ/i.test(text)) {
        healthcareAnswer = `ಡೆಮೊ ಡೆಲಿವರಿ ಅಂದಾಜು ${product.deliveryDays}. ಡೆಲಿವರಿ ಶುಲ್ಕವನ್ನು ಡೆಮೊದಲ್ಲಿ ಹೊಂದಿಸಲಾಗಿಲ್ಲ.`;
      } else if (isKannada && /ಹಿಂತಿರುಗ|ರಿಟರ್ನ್|ಎಕ್ಸ್ಚೇಂಜ್|ಬದಲಾಯಿಸ/i.test(text)) {
        healthcareAnswer = `ಹಿಂತಿರುಗಿಸುವಿಕೆ ಅಥವಾ ವಿನಿಮಯವು ಅಂಗಡಿಯ ನೀತಿ ಮತ್ತು ಅನ್ವಯಿಸುವ ಕಾನೂನಿನ ಮೇಲೆ ಅವಲಂಬಿತವಾಗಿದೆ. ಸಿಬ್ಬಂದಿಯಿಂದ ದೃಢೀಕರಿಸಿ.`;
      } else if (isKannada && /ಯುಪಿಐ|ಪಾವತಿ|ನಗದು|ಕಾರ್ಡ್/i.test(text)) {
        healthcareAnswer = `ಡೆಮೊದಲ್ಲಿ UPI, ನಗದು ಮತ್ತು ಕಾರ್ಡ್ ಪಾವತಿ ಆಯ್ಕೆಗಳು ಮಾದರಿಯಾಗಿ ಸಕ್ರಿಯವಾಗಿವೆ.`;
        healthcareAnswer = isKannada
        healthcareAnswer = isKannada
      } else if (/baby|babies|child|children|kid|age restriction|ಮಗು|ಮಕ್ಕಳ|ಶಿಶು/i.test(text)) {
        healthcareAnswer = isKannada
        healthcareAnswer = isKannada
        healthcareAnswer = isKannada
        healthcareAnswer = isKannada
        healthcareAnswer = isKannada
        healthcareAnswer = isKannada
        healthcareAnswer = isKannada
      if (healthcareAnswer) {
          reply: healthcareAnswer,
          toolCalled: 'healthcareDatasetLookup',