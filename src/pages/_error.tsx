import React from 'react';
import { NextPageContext } from 'next';
import { ErrorDisplay } from '../components/ErrorDisplay';

interface ErrorProps {
  statusCode?: number;
  errMessage?: string;
}

export default function ErrorPage({ statusCode = 500, errMessage }: ErrorProps) {
  return (
    <ErrorDisplay
      statusCode={statusCode}
      errorDetails={errMessage}
      onRetry={() => {
        if (typeof window !== 'undefined') {
          window.location.reload();
        }
      }}
    />
  );
}

ErrorPage.getInitialProps = ({ res, err }: NextPageContext): ErrorProps => {
  const statusCode = res ? res.statusCode : err ? err.statusCode : 404;
  return {
    statusCode: statusCode || 500,
    errMessage: err?.message,
  };
};
