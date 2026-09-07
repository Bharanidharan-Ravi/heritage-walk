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

// You can create basic placeholder components for these to avoid errors
const Services = () => <div className="p-20 text-center text-2xl">Services Page Coming Soon</div>;
const Contact = () => <div className="p-20 text-center text-2xl">Contact Page Coming Soon</div>;

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        {/* All these paths load the SAME page, but the Layout will handle scrolling */}
        <Route path="/" element={<HeritageHome />} />
        <Route path="/about" element={<HeritageHome />} />
        <Route path="/walks" element={<HeritageHome />} />
        <Route path="/walks/:slug" element={<WalkDetail />} />
        <Route path="/gallery" element={<HeritageHome />} />
        <Route path="/contact" element={<HeritageHome />} />
        <Route path="/blog/:slug" element={<BlogPost />} />
        <Route path="/blog" element={<BlogList />} />
        <Route path="/forms/:slug" element={<FormPage />} />
           {/* <Route path="/blogs/:slug" element={<BlogPost2 />} />
        <Route path="/blogs" element={<BlogList2 />} /> */}
      </Route>
    </Routes>
  );
}
export default App;
