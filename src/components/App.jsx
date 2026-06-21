import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '../lib/auth.jsx';
import { Nav } from './Nav.jsx';
import { Home } from '../routes/Home.jsx';
import { Login } from '../routes/Login.jsx';
import { Signup } from '../routes/Signup.jsx';
import { NotFound } from '../routes/NotFound.jsx';

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <div className="min-h-screen">
          <Nav />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </div>
      </AuthProvider>
    </BrowserRouter>
  );
}
