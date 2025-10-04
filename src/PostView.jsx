import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Calendar } from 'lucide-react';
import { subscribeToAuthState } from './services/authService';
import { subscribeToAllPosts } from './services/firestoreService';

const PostView = () => {
  const { date, postId } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState(null);
  const [user, setUser] = useState(null);
  const [firebaseConnected, setFirebaseConnected] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const unsubscribe = subscribeToAuthState((user) => {
        setUser(user);
        setFirebaseConnected(true);
      });
      return () => unsubscribe();
    } catch (error) {
      console.log('Firebase 연결 실패, 데모 모드로 실행');
      setFirebaseConnected(false);
      const savedUser = localStorage.getItem('diary_user');
      if (savedUser) {
        setUser(JSON.parse(savedUser));
      }
    }
  }, []);

  useEffect(() => {
    if (firebaseConnected) {
      const unsubscribe = subscribeToAllPosts((posts) => {
        const dayPosts = posts[date] || [];
        const foundPost = dayPosts.find(p => p.id === postId);
        setPost(foundPost || null);
        setLoading(false);
      });
      return () => unsubscribe();
    } else {
      if (user) {
        const userPostsKey = `diary_posts_${user.uid}`;
        const userPosts = localStorage.getItem(userPostsKey);
        if (userPosts) {
          const posts = JSON.parse(userPosts);
          const dayPosts = posts[date] || [];
          const foundPost = dayPosts.find(p => p.id === postId);
          setPost(foundPost || null);
        }
      } else {
        const defaultPosts = localStorage.getItem('diary_posts_default');
        if (defaultPosts) {
          const posts = JSON.parse(defaultPosts);
          const dayPosts = posts[date] || [];
          const foundPost = dayPosts.find(p => p.id === postId);
          setPost(foundPost || null);
        }
      }
      setLoading(false);
    }
  }, [user, firebaseConnected, date, postId]);

  const renderMarkdownText = (text) => {
    return text
      .split('\n')
      .map((line, lineIndex) => {
        if (line.startsWith('### ')) {
          return (
            <h3 key={lineIndex} className="text-lg font-bold text-gray-900 mt-4 mb-2">
              {line.slice(4)}
            </h3>
          );
        }
        if (line.startsWith('## ')) {
          return (
            <h2 key={lineIndex} className="text-xl font-bold text-gray-900 mt-4 mb-2">
              {line.slice(3)}
            </h2>
          );
        }
        if (line.startsWith('# ')) {
          return (
            <h1 key={lineIndex} className="text-2xl font-bold text-gray-900 mt-4 mb-2">
              {line.slice(2)}
            </h1>
          );
        }
        
        if (line.startsWith('- ') || line.startsWith('* ')) {
          return (
            <li key={lineIndex} className="ml-4 list-disc text-gray-800">
              {processInlineMarkdown(line.slice(2))}
            </li>
          );
        }
        
        if (line.trim() === '') {
          return <br key={lineIndex} />;
        }
        
        return (
          <p key={lineIndex} className="text-gray-800 leading-relaxed mb-2">
            {processInlineMarkdown(line)}
          </p>
        );
      });
  };

  const processInlineMarkdown = (text) => {
    const parts = text.split(/(#[\w가-힣]+|\*\*[^*]+\*\*|\*[^*]+\*|__[^_]+__|_[^_]+_)/g);
    
    return parts.map((part, index) => {
      if (part.match(/^#[\w가-힣]+$/)) {
        return (
          <span key={index} className="text-blue-600 font-medium">
            {part}
          </span>
        );
      }
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={index} className="font-bold">
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (part.startsWith('__') && part.endsWith('__')) {
        return (
          <strong key={index} className="font-bold">
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (part.startsWith('*') && part.endsWith('*') && !part.startsWith('**')) {
        return (
          <em key={index} className="italic">
            {part.slice(1, -1)}
          </em>
        );
      }
      if (part.startsWith('_') && part.endsWith('_') && !part.startsWith('__')) {
        return (
          <em key={index} className="italic">
            {part.slice(1, -1)}
          </em>
        );
      }
      return part;
    });
  };

  const formattedDate = date ? new Date(date + 'T00:00:00').toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }) : '';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-gray-500">로딩 중...</div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-50">
        <Calendar className="w-16 h-16 text-gray-300 mb-4" />
        <h2 className="text-xl font-bold text-gray-800 mb-2">게시물을 찾을 수 없습니다</h2>
        <p className="text-gray-500 mb-6">요청하신 게시물이 존재하지 않거나 삭제되었습니다.</p>
        <Link
          to="/"
          className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800 transition-colors"
        >
          홈으로 돌아가기
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-6">
        {/* 헤더 */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-gray-600 hover:text-black transition-colors mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>돌아가기</span>
          </button>
          
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-2xl font-bold text-gray-900">{formattedDate}</h1>
              <div className="text-sm text-gray-500">{post.createdAt}</div>
            </div>
            
            {/* 게시물 내용 */}
            <div className="prose max-w-none">
              {renderMarkdownText(post.content)}
            </div>

            {/* 이미지 */}
            {post.images && post.images.length > 0 && (
              <div className="mt-6 space-y-4">
                {post.images.map((image) => (
                  <div key={image.id} className="w-full">
                    <img
                      src={image.data}
                      alt={image.name}
                      className="max-w-full h-auto rounded border cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => window.open(image.data, '_blank')}
                    />
                  </div>
                ))}
              </div>
            )}

            {/* 작성자 정보 */}
            {post.author && (
              <div className="mt-6 pt-4 border-t border-gray-200">
                <p className="text-sm text-gray-500">작성자: {post.author}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PostView;
