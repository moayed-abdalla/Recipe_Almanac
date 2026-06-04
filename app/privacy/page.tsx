import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy — Recipe Almanac',
  description: 'Privacy Policy for Recipe Almanac',
};

export default function PrivacyPolicyPage() {
  const effectiveDate = 'June 4, 2026';

  return (
    <main className="min-h-screen bg-base-100 text-base-content">
      <div className="max-w-3xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-8">
          <Link href="/" className="link link-hover text-sm opacity-70">
            ← Back to Recipe Almanac
          </Link>
        </div>

        <h1 className="text-3xl sm:text-4xl font-bold mb-2">Privacy Policy</h1>
        <p className="text-sm opacity-60 mb-10">Effective date: {effectiveDate}</p>

        <div className="prose prose-base max-w-none space-y-8">

          <section>
            <h2 className="text-xl font-semibold mb-3">1. About Recipe Almanac</h2>
            <p className="opacity-80 leading-relaxed">
              Recipe Almanac (&ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;) is an open platform where anyone can
              share, discover, and save recipes. This Privacy Policy explains how we handle
              information collected when you use our website and services.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">2. Information We Collect</h2>
            <p className="opacity-80 leading-relaxed mb-3">
              We collect only the information necessary to operate the platform:
            </p>
            <ul className="list-disc list-inside space-y-2 opacity-80 leading-relaxed pl-2">
              <li>
                <strong>Account information</strong> — your username and email address when you
                register.
              </li>
              <li>
                <strong>User-generated content</strong> — recipes, images, ratings, and comments
                you choose to post publicly.
              </li>
              <li>
                <strong>Usage data</strong> — basic analytics such as pages visited, to help us
                improve the platform.
              </li>
              <li>
                <strong>Device preferences</strong> — theme and display settings stored locally
                in your browser.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">3. Open Platform &amp; User-Posted Content</h2>
            <p className="opacity-80 leading-relaxed mb-3">
              Recipe Almanac is an <strong>open platform</strong>. Users may post recipes,
              images, text, and other content of their choosing. We do not pre-screen every
              submission before it appears on the site.
            </p>
            <p className="opacity-80 leading-relaxed mb-3">
              <strong>We are not liable for content posted by users.</strong> Each user is
              solely responsible for ensuring that the content they submit — including recipes,
              photographs, and written descriptions — does not infringe on the intellectual
              property rights or copyrights of any third party.
            </p>
            <p className="opacity-80 leading-relaxed">
              If you believe content on Recipe Almanac infringes your copyright or is otherwise
              unlawful or unethical, please contact us (see Section 8). We will review reports
              in good faith and do our best to remove content that is found to violate
              applicable rights or our community standards.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">4. Copyright &amp; Intellectual Property</h2>
            <p className="opacity-80 leading-relaxed mb-3">
              Recipe Almanac respects intellectual property rights and expects its users to do
              the same. By posting content on this platform you represent and warrant that:
            </p>
            <ul className="list-disc list-inside space-y-2 opacity-80 leading-relaxed pl-2">
              <li>You own the content you post, or have the right to share it.</li>
              <li>
                Your content does not infringe the copyrights, trademarks, or other
                intellectual property rights of any third party.
              </li>
            </ul>
            <p className="opacity-80 leading-relaxed mt-3">
              We will investigate reported copyright infringements and remove or disable access
              to content that is found to be infringing. Repeat infringers may have their
              accounts suspended or terminated.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">5. How We Use Your Information</h2>
            <ul className="list-disc list-inside space-y-2 opacity-80 leading-relaxed pl-2">
              <li>To operate, maintain, and improve the platform.</li>
              <li>To authenticate your account and keep it secure.</li>
              <li>To respond to your feedback or support requests.</li>
              <li>We do not sell, rent, or trade your personal information to third parties.</li>
              <li>We do not serve advertisements.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">6. Data Storage &amp; Security</h2>
            <p className="opacity-80 leading-relaxed">
              Your data is stored securely using Supabase, a managed database and
              authentication platform. We apply reasonable technical and organisational measures
              to protect your information, but no method of transmission over the internet is
              100% secure. We cannot guarantee absolute security.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">7. Your Rights</h2>
            <p className="opacity-80 leading-relaxed mb-3">
              You may at any time:
            </p>
            <ul className="list-disc list-inside space-y-2 opacity-80 leading-relaxed pl-2">
              <li>Edit or delete recipes and content you have posted.</li>
              <li>Update your account information via your profile settings.</li>
              <li>Request deletion of your account by contacting us.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">8. Contact Us</h2>
            <p className="opacity-80 leading-relaxed">
              If you have questions about this Privacy Policy, wish to report infringing or
              unethical content, or want to request account deletion, please reach out via the{' '}
              <Link href="/feedback" className="link link-primary">
                Feedback
              </Link>{' '}
              page or open an issue on our{' '}
              <a
                href="https://github.com/moayed-abdalla/Recipe_Almanac/"
                target="_blank"
                rel="noopener noreferrer"
                className="link link-primary"
              >
                GitHub repository
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">9. Changes to This Policy</h2>
            <p className="opacity-80 leading-relaxed">
              We may update this Privacy Policy from time to time. When we do, we will revise
              the effective date at the top of this page. Continued use of Recipe Almanac after
              any changes constitutes your acceptance of the updated policy.
            </p>
          </section>

        </div>

        <div className="mt-12 pt-6 border-t border-base-300">
          <p className="text-xs opacity-50 text-center">
            © {new Date().getFullYear()} Recipe Almanac. No ads, no subscriptions, just recipes.
          </p>
        </div>
      </div>
    </main>
  );
}
