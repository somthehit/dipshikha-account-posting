import React from 'react';
import { ErrorDisplay } from '../components/ErrorDisplay';

export default function Custom404() {
  return (
    <ErrorDisplay
      statusCode={404}
      nepaliTitle="खोज्नुभएको पृष्ठ फेला परेन"
      title="404 - Page Not Found"
      nepaliMessage="तपाईंले खोज्नुभएको वेब ठेगाना (URL) सहकारी प्रणालीमा उपलब्ध छैन वा यसलाई परिमार्जन गरिएको हुन सक्छ। तल दिइएका मुख्य मेनु वा सर्टकट प्रयोग गरी अगाडि बढ्न सक्नुहुन्छ।"
      message="The requested accounting page could not be located on this server. Please use the navigation shortcuts below to access your desired ledger or report."
      showNavigationShortcuts={true}
    />
  );
}
