import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '../lib/auth.jsx';
import { Nav } from './Nav.jsx';
// Deep-linkable, shareable CONTENT pages stay in the main chunk so a cold direct
// load isn't delayed by a second round trip to fetch the route chunk (that hurts
// their LCP). Home/Requests/Item/PublicProfile are the content surfaces.
import { Home } from '../routes/Home.jsx';
import { Item } from '../routes/Item.jsx';
import { Requests } from '../routes/Requests.jsx';
import { PublicProfile } from '../routes/PublicProfile.jsx';

// Heavy / secondary routes are code-split — loaded on demand to keep the initial
// download small. Create dominates the savings (it pulls in @vercel/blob, ~100 kB).
// Routes use named exports, so map the module to a default for React.lazy.
const lazyRoute = (loader, name) => lazy(() => loader().then((m) => ({ default: m[name] })));
const Login = lazyRoute(() => import('../routes/Login.jsx'), 'Login');
const Signup = lazyRoute(() => import('../routes/Signup.jsx'), 'Signup');
const Create = lazyRoute(() => import('../routes/Create.jsx'), 'Create');
const Profile = lazyRoute(() => import('../routes/Profile.jsx'), 'Profile');
const EditProfile = lazyRoute(() => import('../routes/EditProfile.jsx'), 'EditProfile');
const MakeRequest = lazyRoute(() => import('../routes/MakeRequest.jsx'), 'MakeRequest');
const NotFound = lazyRoute(() => import('../routes/NotFound.jsx'), 'NotFound');

function RouteFallback() {
  return <p className="eyebrow text-center py-24">Loading…</p>;
}

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <div className="min-h-screen">
          <Nav />
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/create" element={<Create />} />
              <Route path="/item/:id" element={<Item />} />
              <Route path="/item/:id/edit" element={<Create />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/profile/edit" element={<EditProfile />} />
              <Route path="/u/:username" element={<PublicProfile />} />
              <Route path="/make-request" element={<MakeRequest />} />
              <Route path="/requests" element={<Requests />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </div>
      </AuthProvider>
    </BrowserRouter>
  );
}
