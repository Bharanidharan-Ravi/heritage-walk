import './App.css'
import { Routes, Route, Outlet } from 'react-router-dom';
import Layout from './Component/Layout/Layout';
import HeritageHome from './Component/pages/HeritageHome';
import BlogPost from './Component/Sections/BlogPost';
import BlogList from './Component/Sections/BlogList';
import BlogPost2 from './Component/Sections/BlogPost copy';
import BlogList2 from './Component/Sections/BlogList copy';
import WalkDetail from './Component/Sections/WalkDetail';
import FormPage from './Component/Sections/FormPage'; // form-generator (dry scaffold, see docs/form-generator/MASTER_PROMPT.md)
import ExperienceList from './Component/Sections/ExperienceList'; // public selection page for Experience Builder content
import ExperienceDetail from './Component/Sections/ExperienceDetail'; // public detail + booking hand-off page
import NewPrototype from './Component/pages/NewPrototype'; // immersive redesign prototype — throwaway, not linked from nav

// --- Admin panel (Admin/Employee only — "User" role is reserved for a
// separate, not-yet-built student portal and is never granted a route here) ---
import { AdminAuthProvider } from './Component/Admin/AuthContext';
import RequireRole from './Component/Admin/RequireRole';
import AdminLayout from './Component/Admin/AdminLayout';
import AdminLogin from './Component/pages/admin/AdminLogin';
import AdminDashboard from './Component/pages/admin/AdminDashboard';
import AdminUsers from './Component/pages/admin/AdminUsers';
import AdminForms from './Component/pages/admin/AdminForms';
import AdminFormBuilder from './Component/pages/admin/AdminFormBuilder';
import AdminFormSubmissions from './Component/pages/admin/AdminFormSubmissions';
import AdminExperiences from './Component/pages/admin/AdminExperiences';
import AdminExperienceBuilder from './Component/pages/admin/AdminExperienceBuilder';
import { adminConfig } from './Component/Config/admin.config';

// You can create basic placeholder components for these to avoid errors
const Services = () => <div className="p-20 text-center text-2xl">Services Page Coming Soon</div>;
const Contact = () => <div className="p-20 text-center text-2xl">Contact Page Coming Soon</div>;

function App() {
  return (
    <Routes>
      {/* Standalone prototype — outside Layout so it owns its own nav/footer */}
      <Route path="/new" element={<NewPrototype />} />
      <Route element={<Layout />}>
        {/* All these paths load the SAME page, but the Layout will handle scrolling */}
        <Route path="/" element={<HeritageHome />} />
        <Route path="/about" element={<HeritageHome />} />
        <Route path="/walks" element={<HeritageHome />} />
        <Route path="/walks/:slug" element={<WalkDetail />} />
        <Route path="/experiences" element={<ExperienceList />} />
        <Route path="/experiences/:id" element={<ExperienceDetail />} />
        <Route path="/gallery" element={<HeritageHome />} />
        <Route path="/contact" element={<HeritageHome />} />
        <Route path="/blog/:slug" element={<BlogPost />} />
        <Route path="/blog" element={<BlogList />} />
        <Route path="/forms/:slug" element={<FormPage />} />
           {/* <Route path="/blogs/:slug" element={<BlogPost2 />} />
        <Route path="/blogs" element={<BlogList2 />} /> */}
      </Route>

      {/* --- Admin panel: its own auth context + layout, outside the public
          Layout entirely. "User" role never gets past RequireRole here — it's
          reserved for a separate student portal that doesn't exist yet. --- */}
      <Route path="/admin" element={<AdminAuthProvider><Outlet /></AdminAuthProvider>}>
        <Route path="login" element={<AdminLogin />} />
        <Route element={<RequireRole roles={[adminConfig.roles.ADMIN, adminConfig.roles.EMPLOYEE]} />}>
          <Route element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="forms" element={<AdminForms />} />
            <Route path="forms/new" element={<AdminFormBuilder />} />
            <Route path="forms/:id/submissions" element={<AdminFormSubmissions />} />
            <Route path="experiences" element={<AdminExperiences />} />
            <Route path="experiences/new/:type" element={<AdminExperienceBuilder />} />
            <Route path="experiences/:id/edit" element={<AdminExperienceBuilder />} />
            <Route element={<RequireRole roles={[adminConfig.roles.ADMIN]} />}>
              <Route path="users" element={<AdminUsers />} />
            </Route>
          </Route>
        </Route>
      </Route>
    </Routes>
  );
}
export default App;
