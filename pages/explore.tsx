import { useEffect, useState } from 'react';
import { NextPage } from 'next';
import Head from 'next/head';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import PostCard from '../components/PostCard';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../lib/store';
import { Post, Comment, loadFromCache } from '../lib/slices/postsSlice';

const ExplorePage: NextPage = () => {
  const dispatch = useDispatch();
  const { feed, comments } = useSelector((state: RootState) => state.posts as {
    feed: Post[],
    comments: Comment[]
  });
  const [isLoading, setIsLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState<'trending' | 'latest' | 'popular'>('trending');

  useEffect(() => {
    // Load posts from cache
    dispatch(loadFromCache());
    
    // Simulate loading
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [dispatch]);

  // Get comments for a specific post
  const getPostComments = (postId: string) => {
    return comments.filter((comment: Comment) => comment.postId === postId);
  };

  // Apply filters to the feed
  const getFilteredPosts = () => {
    let filteredPosts = [...feed];
    
    switch (selectedFilter) {
      case 'trending':
        // Sort by a combination of recency and engagement
        return filteredPosts.sort((a, b) => {
          const aScore = a.likes * 2 + a.comments * 3 + a.shares;
          const bScore = b.likes * 2 + b.comments * 3 + b.shares;
          return bScore - aScore;
        });
      
      case 'latest':
        // Sort by creation date (newest first)
        return filteredPosts.sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        
      case 'popular':
        // Sort by total likes
        return filteredPosts.sort((a, b) => b.likes - a.likes);
      
      default:
        return filteredPosts;
    }
  };

  return (
    <div className="min-h-screen bg-light dark:bg-dark">
      <Head>
        <title>Explore | GigaAura</title>
        <meta name="description" content="Explore trending content on GigaAura" />
      </Head>

      <Header />

      <main className="container mx-auto px-4 py-6 grid grid-cols-1 md:grid-cols-12 gap-6">
        <div className="hidden md:block md:col-span-3">
          <Sidebar className="sticky top-20" />
        </div>

        <div className="col-span-1 md:col-span-9">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-6">
            <h1 className="text-2xl font-bold text-dark dark:text-white mb-4">Explore</h1>
            
            <div className="flex justify-start space-x-2 border-b dark:border-gray-700 pb-3">
              <button
                onClick={() => setSelectedFilter('trending')}
                className={`px-4 py-2 rounded-full text-sm font-medium ${
                  selectedFilter === 'trending'
                    ? 'bg-primary text-white'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                Trending
              </button>
              <button
                onClick={() => setSelectedFilter('latest')}
                className={`px-4 py-2 rounded-full text-sm font-medium ${
                  selectedFilter === 'latest'
                    ? 'bg-primary text-white'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                Latest
              </button>
              <button
                onClick={() => setSelectedFilter('popular')}
                className={`px-4 py-2 rounded-full text-sm font-medium ${
                  selectedFilter === 'popular'
                    ? 'bg-primary text-white'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                Popular
              </button>
            </div>
          </div>

          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                  <div className="animate-pulse flex space-x-4">
                    <div className="rounded-full bg-gray-200 dark:bg-gray-700 h-12 w-12"></div>
                    <div className="flex-1 space-y-4 py-1">
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                      <div className="space-y-2">
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {getFilteredPosts().length === 0 ? (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
                  <h2 className="text-xl font-semibold text-dark dark:text-white mb-2">No posts yet</h2>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    Be the first to create content and earn Aura Points!
                  </p>
                </div>
              ) : (
                getFilteredPosts().map((post: Post) => (
                  <PostCard 
                    key={post.id} 
                    post={post} 
                    comments={getPostComments(post.id)} 
                  />
                ))
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default ExplorePage; 