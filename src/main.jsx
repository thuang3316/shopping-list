import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router'
import { Home } from './components/Home.jsx'
import { Shop } from './components/Shop.jsx'
import { Cart } from './components/Cart.jsx'
import { Nav } from './components/Nav.jsx'

import './styling/styles.css'

const router = createBrowserRouter([
  {
    path: "/",
    element: <Home />
  },
  {
    path: "/cart",
    element: <Cart />
  },
  {
    path: "/shop",
    element: <Shop />
  }
])

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <div className='flex flex-col gap-4 justify-center items-center'>
      <RouterProvider router={router}/>
    </div>
  </StrictMode>,
)
