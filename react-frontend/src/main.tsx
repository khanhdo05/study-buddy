import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './styles/workspace.css'
import './styles/forms.css'
import './styles/accessibility.css'
import { AppRouter } from './app/AppRouter.tsx'
import { AccessibilityProvider } from './lib/accessibility.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AccessibilityProvider>
      <AppRouter />
    </AccessibilityProvider>
  </StrictMode>,
)
