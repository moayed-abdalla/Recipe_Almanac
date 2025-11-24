import Link from 'next/link';
import Image from 'next/image';

export default function Footer() {
  return (
    <footer className="footer bg-base-200 p-10 text-base-content">
      <div className="container mx-auto">
        <div className="footer-content flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center">
              <Image
                src="/logo.png"
                alt="Recipe Almanac"
                width={40}
                height={40}
                className="mr-2"
              />
              <span className="text-xl font-bold">Recipe Almanac</span>
            </Link>
          </div>
          
          <nav className="flex gap-4">
            <Link href="/" className="link link-hover">Home</Link>
            <Link href="/profile" className="link link-hover">My Profile</Link>
            <Link href="/almanac" className="link link-hover">My Almanac</Link>
            <a
              href="https://github.com/moayed-abdalla/Recipe_Almanac/"
              target="_blank"
              rel="noopener noreferrer"
              className="link link-hover"
            >
              GitHub
            </a>
          </nav>
        </div>
        
        <div className="text-center mt-4 text-sm opacity-70">
          <p>© {new Date().getFullYear()} Recipe Almanac. No ads, no subscriptions, just recipes.</p>
        </div>
      </div>
    </footer>
  );
}

