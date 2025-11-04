// src/index.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GraphQLClient } from 'graphql-request';

// Use the local proxy we configured in vite.config.js
const client = new GraphQLClient("/graphql"); 

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // This queryFn is the "brain" that tells all hooks how to fetch
      queryFn: ({ queryKey }) => {
        const [document, variables] = queryKey;
        return client.request(document, variables);
      },
    },
  },
});

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>
);