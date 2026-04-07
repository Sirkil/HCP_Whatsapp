/// Sending 'banner_app_template' Template with Detailed Error Handling
async function sendWhatsAppTemplate(to, name, email, pin) {
  try {
    // Construct the URL parameters as a single string for Meta's single URL variable
    const dynamicUrlParams = `?email=${encodeURIComponent(email)}&pass=${encodeURIComponent(pin)}`;

    const response = await fetch(
      `https://graph.facebook.com/v21.0/${PHONE_NUMBER_ID}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${WHATSAPP_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: to,
          type: "template",
          template: {
            name: "banner_app_template",
            language: { code: "en" },
            components: [
              {
                type: "header",
                parameters: [
                  {
                    type: "image",
                    image: {
                      // link: "https://raw.githubusercontent.com/Sirkil/Haleon_Partners_club/main/Asset%201.png" 
                      link: "https://raw.githubusercontent.com/Sirkil/Haleon_Partners_club/main/Logo.png" 
                    }
                  }
                ]
              },
              {
                type: "body",
                parameters: [
                  {
                    type: "text",
                    text: name // Matches {{1}} in your template body
                  }
                ]
              },
              {
                type: "button",
                sub_type: "url",
                index: "0", 
                parameters: [
                  {
                    type: "text",
                    text: dynamicUrlParams // Appends to https://sirkil.github.io/Haleon_Partners_club/?
                  }
                ]
              }
            ] 
          },
        }),
      }
    );

    const data = await response.json();

    // --- ENHANCED ERROR HANDLING BLOCK ---
    if (!response.ok) {
      const apiError = data.error || {};
      const errorMessage = apiError.message || "Unknown error occurred";
      const errorCode = apiError.code || "No Code";
      
      // Check specifically for template parameter/component mismatch errors
      if (
        errorMessage.toLowerCase().includes("parameter") || 
        errorMessage.toLowerCase().includes("component") ||
        errorMessage.toLowerCase().includes("template")
      ) {
         console.error("\n🛑 TEMPLATE STRUCTURE MISMATCH:");
         console.error("It looks like this template requires variables, a dynamic image link, or buttons that were not provided in your 'components' array.");
         console.error(`Meta API says: "${errorMessage}"\n`);
      } else {
         // General API error (e.g., bad token, invalid number)
         console.error(`\n❌ Meta API Error [Code: ${errorCode}]: ${errorMessage}\n`);
      }

      // Sometimes Meta provides an extra layer of detail
      if (apiError.error_data && apiError.error_data.details) {
         console.error(`Debugging Details: ${apiError.error_data.details}\n`);
      }

      throw new Error(errorMessage);
    }
    // ------------------------------------

    console.log(`✅ Template 'banner_app_template' successfully sent to ${to}`);
    return { success: true, details: data };
    
  } catch (error) {
    console.error(`❌ Request Failed:`, error.message);
    return { success: false, details: error.message };
  }
}