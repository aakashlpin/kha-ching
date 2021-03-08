/* eslint-disable jsx-a11y/accessible-emoji */
import Link from 'next/link';
import { useRouter } from 'next/router';
import React, { useEffect, useState } from 'react';

import fetchJson from '../lib/fetchJson';
import useUser from '../lib/useUser';

const APP_GIT_HASH = process.env.NEXT_PUBLIC_GIT_HASH;

const Header = () => {
  const { user, mutateUser } = useUser();
  const [recentGitHash, setRecentGitHash] = useState(null);
  const [isUpdateAvailable, setIsUpdateAvailable] = useState(false);

  useEffect(() => {
    async function fn() {
      const url = `https://api.github.com/repos/aakashlpin/kha-ching/commits?per_page=1`;
      try {
        const [commit] = await fetchJson(url);
        const { sha } = commit;
        setRecentGitHash(sha);
      } catch (e) {
        console.log(`fetchJson on ${url} failed`, e);
      }
    }

    fn();
  }, []);

  useEffect(() => {
    function fn() {
      if (!recentGitHash) {
        return;
      }

      setIsUpdateAvailable(recentGitHash !== APP_GIT_HASH);
    }

    fn();
  }, [recentGitHash]);

  const router = useRouter();
  return (
    <header>
      <nav>
        <ul>
          {isUpdateAvailable ? (
            <li>
              <a href="https://cloud.digitalocean.com/apps">🔥 App Update 🔥</a>
            </li>
          ) : null}

          <li>
            <Link href="/dashboard">
              <a>Trading</a>
            </Link>
          </li>
          {!user?.isLoggedIn && (
            <li>
              <Link href="/login">
                <a>Login</a>
              </Link>
            </li>
          )}
          {user?.isLoggedIn && (
            <>
              <li>
                <Link href="/profile">
                  <a>
                    <img
                      alt={user.session.user_shortname}
                      src={user.session.avatar_url}
                      width={20}
                      height={20}
                    />{' '}
                    Profile
                  </a>
                </Link>
              </li>
              <li>
                <a
                  href="/api/logout"
                  onClick={async (e) => {
                    e.preventDefault();
                    await mutateUser(fetchJson('/api/logout'));
                    router.push('/login');
                  }}>
                  Logout
                </a>
              </li>
            </>
          )}
        </ul>
      </nav>
      <style jsx>{`
        ul {
          display: flex;
          list-style: none;
          margin-left: 0;
          padding-left: 0;
        }
        li {
          margin-right: 1rem;
          display: flex;
        }
        li:first-child {
          margin-left: auto;
        }
        a {
          color: #fff;
          text-decoration: none;
          display: flex;
          align-items: center;
        }
        a img {
          margin-right: 1em;
        }
        header {
          padding: 0.2rem;
          color: #fff;
          background-color: #333;
        }
      `}</style>
    </header>
  );
};

export default Header;
