import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '../lib/auth.jsx';
import { Nav } from './Nav.jsx';
import { Home } from '../routes/Home.jsx';
import { Login } from '../routes/Login.jsx';
import { Signup } from '../routes/Signup.jsx';
import { Create } from '../routes/Create.jsx';
import { Item } from '../routes/Item.jsx';
import { Profile } from '../routes/Profile.jsx';
import { PublicProfile } from '../routes/PublicProfile.jsx';
import { MakeRequest } from '../routes/MakeRequest.jsx';
import { Requests } from '../routes/Requests.jsx';
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
            <Route path="/create" element={<Create />} />
            <Route path="/item/:id" element={<Item />} />
            <Route path="/item/:id/edit" element={<Create />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/u/:username" element={<PublicProfile />} />
            <Route path="/make-request" element={<MakeRequest />} />
            <Route path="/requests" element={<Requests />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </div>
      </AuthProvider>
    </BrowserRouter>
  );
}
