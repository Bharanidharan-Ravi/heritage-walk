import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import Sitemap from 'vite-plugin-sitemap';
// Note: Using relative path './src/...' is safer in vite config than absolute '/src/...'
import { client } from "./src/sanityClient.js"; 

export default defineConfig(async () => {
  
  // 1. Fetch walk slugs
  const walkQuery = `*[_type == "walk" && defined(slug.current)]{ "slug": slug.current }`;
  const walks = await client.fetch(walkQuery);
  const walkRoutes = walks.map((walk) => `/walks/${walk.slug}`);

  // 2. Fetch blog slugs (Change "post" to your actual schema name if different)
  const blogQuery = `*[_type == "post" && defined(slug.current)]{ "slug": slug.current }`;
  const blogs = await client.fetch(blogQuery);
  const blogRoutes = blogs.map((blog) => `/blogs/${blog.slug}`);

  // 3. Combine both arrays into one master list of dynamic routes
  const allDynamicRoutes = [...walkRoutes, ...blogRoutes];

  return {
    plugins: [
      react(),
      Sitemap({
        hostname: 'https://www.archaeotrails.com',
        dynamicRoutes: allDynamicRoutes, // Pass the combined routes here
        generateRobotsTxt: true
      })
    ],
  };
});