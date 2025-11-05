/**
 * FOOTER COMPONENT
 * 
 * Global footer displayed at the bottom of all pages.
 * 
 * Features:
 * - Logo/Home link
 * - Quick navigation links
 * - GitHub repository link
 * - Copyright information
 * - Responsive layout
 */

import { Link } from 'react-router';

const Footer = () => {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="footer footer-center p-10 bg-base-200 text-base-content mt-auto">
      <aside>
        <Link to="/" className="flex items-center gap-2 mb-4">
          <img src="/logo.png" alt="Recipe Almanac" className="h-12 w-12" />
          <span className="text-2xl font-bold">Recipe Almanac</span>
        </Link>
        <p className="font-semibold">
          Your ad-free, open-source recipe book
        </p>
        <p className="text-sm opacity-70">
          Share, browse, and write your own recipes freely
        </p>
      </aside>
      
      <nav className="grid grid-flow-col gap-4">
        <Link to="/" className="link link-hover">Home</Link>
        <Link to="/almanac" className="link link-hover">My Almanac</Link>
        <Link to="/profile" className="link link-hover">Profile</Link>
        <a 
          href="https://github.com/moayed-abdalla/Recipe_Almanac/" 
          target="_blank" 
          rel="noopener noreferrer"
          className="link link-hover"
        >
          GitHub
        </a>
      </nav>
      
      <aside className="text-sm opacity-70">
        <p>© {currentYear} Recipe Almanac. No ads, no tracking, just recipes.</p>
      </aside>
    </footer>
  );
};

export default Footer;
