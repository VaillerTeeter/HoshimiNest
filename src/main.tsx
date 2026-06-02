import 'animal-island-ui/dist/index.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import App from './App';
import './styles/fonts.css';
import './styles/theme.css';

document.body.classList.add('animal-cursor--force');

const rootElement = document.querySelector('#root');
if (rootElement === null) {
  throw new Error('Root element #root not found');
}
createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
