import React from 'react';
import { ErrorDisplay } from '../components/ErrorDisplay';

export default function Custom500() {
  return (
    <ErrorDisplay
      statusCode={500}
      nepaliTitle="प्रणालीमा आन्तरिक समस्या उत्पन्न भयो"
      title="500 - Internal Server Error"
      nepaliMessage="सहकारी लेखा प्रणालीको सर्भर वा डाटा स्रोत (Google Sheets) सँग संवाद गर्दा समस्या देखापर्यो। तपाईंको अघिल्लो डाटा तथा भौचरहरू सुरक्षित छन्। कृपया एकछिन पर्खेर ताजा गर्नुहोस् वा पुनः प्रयास गर्नुहोस्।"
      message="The server encountered an unexpected condition while processing accounting records. Your existing data remains safe and synchronized."
      showNavigationShortcuts={true}
      onRetry={() => {
        if (typeof window !== 'undefined') {
          window.location.reload();
        }
      }}
    />
  );
}
