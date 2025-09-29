import React, { useState, useEffect } from 'react';
import { Calendar, Edit3, Check, X, Image, Trash } from 'lucide-react';
import { subscribeToAuthState, loginWithEmail, signupWithEmail, logout, getErrorMessage } from './services/authService';
import {  
  addPostToDate, 
  updatePostInDate, 
  deletePostFromDate, 
  subscribeToUserPosts 
} from './services/firestoreService';

const DiaryBoard = () => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [posts, setPosts] = useState({});
  const [isWriting, setIsWriting] = useState(false);
  const [newPost, setNewPost] = useState('');
  const [newPostImages, setNewPostImages] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');
  const [editImages, setEditImages] = useState([]);
  const [editingDate, setEditingDate] = useState(null);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [selectedTags, setSelectedTags] = useState([]);
  const [expandedPosts, setExpandedPosts] = useState(new Set());
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSignupMode, setIsSignupMode] = useState(false);
  const [firebaseConnected, setFirebaseConnected] = useState(false);

  // Firebase 연결 확인 및 초기 사용자 설정
  useEffect(() => {
    try {
      const unsubscribe = subscribeToAuthState((user) => {
        setUser(user);
        setFirebaseConnected(true);
        if (user) {
          setIsLoginModalOpen(false);
          setLoginError('');
          setLoginForm({ email: '', password: '' });
        }
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

  // 사용자별 또는 공개 데이터 실시간 구독/로드
  useEffect(() => {
    const publicViewingUID = "iheQe0Z0UWhN0IVU00Lwip1EWsr2";
    if (firebaseConnected) {
      const uidToSubscribe = user ? user.uid : publicViewingUID;
      const unsubscribe = subscribeToUserPosts(uidToSubscribe, (newPosts) => {
        setPosts(newPosts);
      });
      return () => unsubscribe();
    } else {
      if (user) {
        const userPostsKey = `diary_posts_${user.uid}`;
        const userPosts = localStorage.getItem(userPostsKey);
        if (userPosts) {
          setPosts(JSON.parse(userPosts));
        }
      } else {
        const defaultPosts = localStorage.getItem('diary_posts_default');
        if (defaultPosts) {
          setPosts(JSON.parse(defaultPosts));
        }
      }
    }
  }, [user, firebaseConnected]);

  // 로그인/회원가입 함수
  const handleLogin = async (email, password) => {
    setIsLoading(true);
    setLoginError('');
    
    try {
      if (firebaseConnected) {
        if (isSignupMode) {
          await signupWithEmail(email, password);
        } else {
          await loginWithEmail(email, password);
        }
      } else {
        if (isSignupMode) {
          const existingUsers = JSON.parse(localStorage.getItem('diary_users') || '[]');
          if (existingUsers.find(u => u.email === email)) {
            throw new Error('이미 사용 중인 이메일입니다.');
          }
          if (password.length < 6) {
            throw new Error('비밀번호는 6자 이상이어야 합니다.');
          }
          const newUser = { uid: Date.now().toString(), email };
          existingUsers.push({ ...newUser, password });
          localStorage.setItem('diary_users', JSON.stringify(existingUsers));
          localStorage.setItem('diary_user', JSON.stringify(newUser));
          setUser(newUser);
        } else {
          const existingUsers = JSON.parse(localStorage.getItem('diary_users') || '[]');
          const foundUser = existingUsers.find(u => u.email === email && u.password === password);
          if (!foundUser) {
            throw new Error('이메일 또는 비밀번호가 올바르지 않습니다.');
          }
          const loginUser = { uid: foundUser.uid, email: foundUser.email };
          localStorage.setItem('diary_user', JSON.stringify(loginUser));
          setUser(loginUser);
        }
        setIsLoginModalOpen(false);
        setLoginForm({ email: '', password: '' });
        setIsSignupMode(false);
      }
    } catch (error) {
      if (firebaseConnected) {
        setLoginError(getErrorMessage(error));
      } else {
        setLoginError(error.message);
      }
    }
    setIsLoading(false);
  };

  // 로그아웃 함수
  const handleLogout = async () => {
    try {
      if (firebaseConnected) {
        await logout();
      } else {
        localStorage.removeItem('diary_user');
        setUser(null);
      }
      setIsWriting(false);
      setEditingId(null);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // 데모 모드용 데이터 저장
  const saveUserPosts = (newPosts) => {
    if (!firebaseConnected) {
      if (user) {
        const userPostsKey = `diary_posts_${user.uid}`;
        localStorage.setItem(userPostsKey, JSON.stringify(newPosts));
        localStorage.setItem('diary_posts_default', JSON.stringify(newPosts));
      } else {
        localStorage.setItem('diary_posts_default', JSON.stringify(newPosts));
      }
      setPosts(newPosts);
    }
  };

  // 글 작성
  const handleWrite = async () => {
    if (!user) {
      setIsLoginModalOpen(true); // 비로그인 시 로그인 모달 표시
      return;
    }

    if (isWriting) {
      if (newPost.trim() || newPostImages.length > 0) {
        try {
          setIsLoading(true);
          const postId = Date.now().toString();
          const newPostData = {
            id: postId,
            content: newPost.trim(),
            images: newPostImages,
            createdAt: new Date().toLocaleTimeString(),
            author: user.email
          };
          
          if (firebaseConnected) {
            await addPostToDate(user.uid, selectedDate, newPostData);
          } else {
            const newPosts = {
              ...posts,
              [selectedDate]: [
                ...(posts[selectedDate] || []),
                newPostData
              ]
            };
            saveUserPosts(newPosts);
          }
          
          setNewPost('');
          setNewPostImages([]);
        } catch (error) {
          console.error('Error adding post:', error);
          setLoginError('글 저장 중 오류가 발생했습니다.');
        } finally {
          setIsLoading(false);
        }
      }
      setIsWriting(false);
    } else {
      setIsWriting(true);
    }
  };

  // 글 수정 시작
  const startEdit = (postId, content, images = [], postDate = null) => {
    if (!user) {
      setIsLoginModalOpen(true);
      return;
    }
    setEditingId(postId);
    setEditText(content);
    setEditImages(images);
    setEditingDate(postDate || selectedDate);
  };

  // 글 수정 완료
  const completeEdit = async () => {
    if (!user || !editingId || !editingDate) return;

    try {
      setIsLoading(true);
      
      if (firebaseConnected) {
        const updatedData = {
          content: editText.trim(),
          images: editImages
        };
        await updatePostInDate(user.uid, editingDate, editingId, updatedData);
      } else {
        const newPosts = {
          ...posts, 
          [editingDate]: posts[editingDate].map(post =>
            post.id === editingId
              ? { ...post, content: editText.trim(), images: editImages }
              : post
          )
        };
        saveUserPosts(newPosts);
      }
      
      setEditingId(null);
      setEditText('');
      setEditImages([]);
      setEditingDate(null);
    } catch (error) {
      console.error('Error updating post:', error);
      setLoginError('글 수정 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // 글 삭제
  const handleDelete = async (postId, postDate = null) => {
    if (!user) {
      setIsLoginModalOpen(true);
      return;
    }

    const isConfirmed = window.confirm('정말 삭제하겠습니까?');
    if (!isConfirmed) return;

    const targetDate = postDate || selectedDate;

    try {
      setIsLoading(true);
      if (firebaseConnected) {
        await deletePostFromDate(user.uid, targetDate, postId);
      } else {
        const dayPosts = posts[targetDate] || [];
        const newDayPosts = dayPosts.filter(p => p.id !== postId);
        const newPosts = { ...posts };
        if (newDayPosts.length === 0) {
          delete newPosts[targetDate];
        } else {
          newPosts[targetDate] = newDayPosts;
        }
        saveUserPosts(newPosts);
      }
      if (editingId === postId) {
        setEditingId(null);
        setEditText('');
        setEditImages([]);
        setEditingDate(null);
      }
    } catch (error) {
      console.error('Error deleting post:', error);
      setLoginError('글 삭제 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // 게시글 펼치기/접기
  const toggleExpandPost = (postId) => {
    setExpandedPosts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(postId)) {
        newSet.delete(postId);
      } else {
        newSet.add(postId);
      }
      return newSet;
    });
  };

  // 텍스트가 길거나 이미지가 있는지 확인
  const shouldShowMoreButton = (post) => {
    const hasImages = post.images && post.images.length > 0;
    const hasLongText = post.content.length > 200;
    return hasImages || hasLongText;
  };

  // 마크다운 스타일 텍스트 렌더링
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

  // 인라인 마크다운 처리
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

  // 이미지 파일을 base64로 변환
  const convertToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = error => reject(error);
    });
  };

  // 이미지 추가
  const handleImageAdd = async (event) => {
    const files = Array.from(event.target.files);
    const imagePromises = files.map(async (file) => {
      if (file.type.startsWith('image/')) {
        const base64 = await convertToBase64(file);
        return {
          id: `img_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
          name: file.name,
          data: base64
        };
      }
      return null;
    });

    const newImages = (await Promise.all(imagePromises)).filter(img => img !== null);
    setNewPostImages(prev => [...prev, ...newImages]);
  };

  // 이미지 삭제
  const removeImage = (imageId, isEditing = false) => {
    if (isEditing) {
      setEditImages(prev => prev.filter(img => img.id !== imageId));
    } else {
      setNewPostImages(prev => prev.filter(img => img.id !== imageId));
    }
  };

  // 해시태그 추출 함수
  const extractHashtags = (text) => {
    const hashtagRegex = /#[\w가-힣]+/g;
    const matches = text.match(hashtagRegex);
    return matches || [];
  };

  // 모든 해시태그 추출
  const getAllHashtags = () => {
    const allTags = new Set();
    Object.values(posts).forEach(dayPosts => {
      dayPosts.forEach(post => {
        const tags = extractHashtags(post.content);
        tags.forEach(tag => allTags.add(tag));
      });
    });
    return Array.from(allTags).sort();
  };

  // 해시태그로 필터링된 글 목록
  const getFilteredPosts = () => {
    const selectedPosts = posts[selectedDate] || [];
    
    if (selectedTags.length === 0) {
      return selectedPosts;
    }

    const allFilteredPosts = [];
    Object.entries(posts).forEach(([date, dayPosts]) => {
      dayPosts.forEach(post => {
        const postTags = extractHashtags(post.content);
        const hasAllSelectedTags = selectedTags.every(selectedTag =>
          postTags.some(postTag => postTag === selectedTag)
        );
        if (hasAllSelectedTags) {
          allFilteredPosts.push({
            ...post,
            date: date
          });
        }
      });
    });

    return allFilteredPosts;
  };

  // 해시태그 선택/해제
  const toggleTag = (tag) => {
    setSelectedTags(prev => {
      const newTags = prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag];
      return newTags;
    });
  };

  // 달력 생성을 위한 함수들
  const getCurrentMonth = () => {
    const today = new Date();
    return {
      year: today.getFullYear(),
      month: today.getMonth()
    };
  };

  const [currentMonth, setCurrentMonth] = useState(getCurrentMonth());

  const getDaysInMonth = (year, month) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year, month) => {
    return new Date(year, month, 1).getDay();
  };

  const formatDate = (year, month, day) => {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };

  const changeMonth = (direction) => {
    setCurrentMonth(prev => {
      const newMonth = prev.month + direction;
      if (newMonth < 0) {
        return { year: prev.year - 1, month: 11 };
      } else if (newMonth > 11) {
        return { year: prev.year + 1, month: 0 };
      }
      return { ...prev, month: newMonth };
    });
  };

  // 달력 렌더링
  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentMonth.year, currentMonth.month);
    const firstDay = getFirstDayOfMonth(currentMonth.year, currentMonth.month);
    const days = [];

    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-10"></div>);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = formatDate(currentMonth.year, currentMonth.month, day);
      const hasPost = posts[dateStr] && posts[dateStr].length > 0;
      const isSelected = dateStr === selectedDate;
      const isToday = dateStr === new Date().toISOString().split('T')[0];

      days.push(
        <button
          key={day}
          onClick={() => setSelectedDate(dateStr)}
          className={`
            h-10 w-10 text-sm font-medium transition-all duration-200 relative
            ${isSelected
              ? 'bg-black text-white'
              : isToday
                ? 'bg-gray-100 text-black hover:bg-gray-200'
                : 'hover:bg-gray-50'
            }
          `}
        >
          {hasPost && (
            <div className="absolute top-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-black rounded-full"></div>
          )}
          {day}
        </button>
      );
    }

    return days;
  };

  const monthNames = [
    '1월', '2월', '3월', '4월', '5월', '6월',
    '7월', '8월', '9월', '10월', '11월', '12월'
  ];

  const selectedPosts = posts[selectedDate] || [];
  const filteredPosts = getFilteredPosts();
  const formattedSelectedDate = new Date(selectedDate + 'T00:00:00').toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div className="flex h-screen bg-gray-50">
      {/* 로그인 모달 */}
      {isLoginModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl w-96">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">
                {isSignupMode ? '회원가입' : '로그인'}
              </h3>
              <button
                onClick={() => {
                  setIsLoginModalOpen(false);
                  setLoginError('');
                  setIsSignupMode(false);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  이메일
                </label>
                <input
                  type="email"
                  value={loginForm.email}
                  onChange={(e) => setLoginForm(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="your-email@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  비밀번호
                </label>
                <input
                  type="password"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm(prev => ({ ...prev, password: e.target.value }))}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={isSignupMode ? "6자 이상 입력하세요" : "비밀번호"}
                />
              </div>

              {loginError && (
                <div className="text-red-500 text-sm bg-red-50 p-2 rounded">
                  {loginError}
                </div>
              )}

              {/* 데모 계정 정보 (데모 모드일 때만 표시) */}
              {!firebaseConnected && !isSignupMode && (
                <div className="bg-blue-50 p-3 rounded-lg text-sm text-blue-700">
                  <p><strong>데모 계정:</strong></p>
                  <p>이메일: admin@example.com</p>
                  <p>비밀번호: password123</p>
                </div>
              )}

              <button
                onClick={() => handleLogin(loginForm.email, loginForm.password)}
                disabled={isLoading}
                className="w-full bg-blue-500 text-white p-3 rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? (isSignupMode ? '가입 중...' : '로그인 중...') : (isSignupMode ? '회원가입' : '로그인')}
              </button>

              {/* 회원가입/로그인 전환 버튼 */}
              <div className="text-center">
                <button
                  onClick={() => {
                    setIsSignupMode(!isSignupMode);
                    setLoginError('');
                  }}
                  className="text-sm text-blue-500 hover:text-blue-600"
                >
                  {isSignupMode ? '이미 계정이 있으신가요? 로그인' : '계정이 없으신가요? 회원가입'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 왼쪽 달력 영역 */}
      <div className="w-[400px] flex-shrink-0 p-6 bg-white shadow-lg">
        <div className="w-full">
          {/* 달력 헤더 */}
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => changeMonth(-1)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              ←
            </button>
            <div className="flex items-center gap-2">
              <select
                value={currentMonth.year}
                onChange={(e) => setCurrentMonth(prev => ({ ...prev, year: parseInt(e.target.value) }))}
                className="px-3 py-1 border border-gray-300 rounded-lg text-lg font-bold text-gray-800 bg-white hover:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {Array.from({ length: 21 }, (_, i) => new Date().getFullYear() - 10 + i).map(year => (
                  <option key={year} value={year}>{year}년</option>
                ))}
              </select>
              <select
                value={currentMonth.month}
                onChange={(e) => setCurrentMonth(prev => ({ ...prev, month: parseInt(e.target.value) }))}
                className="px-3 py-1 border border-gray-300 rounded-lg text-lg font-bold text-gray-800 bg-white hover:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {monthNames.map((name, index) => (
                  <option key={index} value={index}>{name}</option>
                ))}
              </select>
            </div>
            <button
              onClick={() => changeMonth(1)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              →
            </button>
          </div>

          {/* 요일 헤더 */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['일', '월', '화', '수', '목', '금', '토'].map(day => (
              <div key={day} className="h-10 flex items-center justify-center text-sm font-medium text-gray-500">
                {day}
              </div>
            ))}
          </div>

          {/* 달력 날짜들 */}
          <div className="grid grid-cols-7 gap-1">
            {renderCalendar()}
          </div>

          {/* 해시태그 목록 */}
          {getAllHashtags().length > 0 && (
            <div className="mt-6">
              <div className="text-xs text-gray-500 mb-2">tags</div>
              <div className="flex flex-wrap gap-1">
                {getAllHashtags().map(tag => (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className={`
                      px-2 py-1 text-xs transition-all duration-200
                      ${selectedTags.includes(tag)
                        ? 'bg-black text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }
                    `}
                  >
                    {tag}
                  </button>
                ))}
              </div>
              {selectedTags.length > 0 && (
                <button
                  onClick={() => setSelectedTags([])}
                  className="mt-2 text-xs text-gray-500 hover:text-black transition-colors"
                >
                  clear filter
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 오른쪽 글 목록 영역 */}
      <div className="flex-1 p-6 bg-gray-50">
        <div className="h-full flex flex-col">
          {/* 헤더 */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-bold text-gray-800">
                {selectedTags.length > 0 ? 'Tagged Posts' : formattedSelectedDate}
              </h3>
              {selectedTags.length > 0 && (
                <div className="text-sm text-gray-500 mt-1">
                  filtering by: {selectedTags.join(' ')}
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleWrite}
                className={`
                  px-3 py-1 text-sm font-medium transition-all duration-200
                  ${user
                    ? 'bg-black text-white hover:bg-gray-800'
                    : 'bg-white text-black border border-gray-300 hover:bg-gray-100'
                  }
                `}
                title={!user ? '로그인이 필요합니다' : '새 글 작성'}
              >
                +
              </button>
              {/* [수정] 로그인/로그아웃 버튼 제거 */}
            </div>
          </div>

          {/* 글 작성 영역 */}
          {isWriting && user && (
            <div className="mb-6 p-4 bg-white rounded-lg shadow-sm border-2 border-blue-200">
              <textarea
                value={newPost}
                onChange={(e) => setNewPost(e.target.value)}
                placeholder="오늘 있었던 일을 기록해보세요..."
                className="w-full h-32 p-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-3"
                autoFocus
              />

              {/* 이미지 미리보기 */}
              {newPostImages.length > 0 && (
                <div className="mb-3">
                  <div className="grid grid-cols-2 gap-2">
                    {newPostImages.map((image) => (
                      <div key={image.id} className="relative">
                        <img
                          src={image.data}
                          alt={image.name}
                          className="w-full h-32 object-cover rounded border"
                        />
                        <button
                          onClick={() => removeImage(image.id)}
                          className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 이미지 추가 버튼 */}
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1 px-2 py-1 text-sm text-gray-600 hover:text-black cursor-pointer transition-colors">
                  <Image className="w-4 h-4" />
                  <span>image</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageAdd}
                    className="hidden"
                  />
                </label>
                <span className="text-xs text-gray-400">
                  {newPostImages.length > 0 && `${newPostImages.length} image(s) added`}
                </span>
              </div>
            </div>
          )}

          {/* 글 목록 */}
          <div className="flex-1 overflow-y-auto">
            {filteredPosts.length === 0 ? (
              <div className="text-center text-gray-500 mt-20">
                <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                {selectedTags.length > 0 ? (
                  selectedPosts.length === 0 ? (
                    <>
                      <p>이 날에는 작성된 글이 없습니다.</p>
                      {user ? (
                        <p className="text-sm">+ 버튼을 눌러 새 글을 작성해보세요.</p>
                      ) : (
                        <p className="text-sm">다른 날짜의 글을 보거나 로그인하여 작성해보세요.</p>
                      )}
                    </>
                  ) : (
                    <>
                      <p>선택한 태그와 일치하는 글이 없습니다.</p>
                      <p className="text-sm">다른 태그를 선택하거나 필터를 해제해보세요.</p>
                    </>
                  )
                ) : selectedPosts.length === 0 ? (
                  <>
                    <p>이 날에는 작성된 글이 없습니다.</p>
                    {user ? (
                      <p className="text-sm">+ 버튼을 눌러 새 글을 작성해보세요.</p>
                    ) : (
                      <p className="text-sm">다른 날짜의 글을 보거나 로그인하여 작성해보세요.</p>
                    )}
                  </>
                ) : null}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredPosts.map((post) => (
                  <div key={post.id} className="bg-white p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow">
                    {editingId === post.id ? (
                      <div className="space-y-3">
                        <textarea
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          className="w-full h-24 p-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                          autoFocus
                        />

                        {/* 수정 중 이미지 미리보기 */}
                        {editImages.length > 0 && (
                          <div className="grid grid-cols-2 gap-2">
                            {editImages.map((image) => (
                              <div key={image.id} className="relative">
                                <img
                                  src={image.data}
                                  alt={image.name}
                                  className="w-full h-32 object-cover rounded border"
                                />
                                <button
                                  onClick={() => removeImage(image.id, true)}
                                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* 수정 중 이미지 추가 */}
                        <label className="flex items-center gap-1 px-2 py-1 text-sm text-gray-600 hover:text-black cursor-pointer transition-colors w-fit">
                          <Image className="w-4 h-4" />
                          <span>add image</span>
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={async (e) => {
                              const files = Array.from(e.target.files);
                              const imagePromises = files.map(async (file) => {
                                if (file.type.startsWith('image/')) {
                                  const base64 = await convertToBase64(file);
                                  return {
                                    id: `img_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
                                    name: file.name,
                                    data: base64
                                  };
                                }
                                return null;
                              });
                              const newImages = (await Promise.all(imagePromises)).filter(img => img !== null);
                              setEditImages(prev => [...prev, ...newImages]);
                            }}
                            className="hidden"
                          />
                        </label>

                        <div className="flex gap-2">
                          <button
                            onClick={completeEdit}
                            className="px-3 py-1 bg-green-500 text-white text-sm rounded hover:bg-green-600 transition-colors"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setEditingId(null);
                              setEditText('');
                              setEditImages([]);
                              setEditingDate(null);
                            }}
                            className="px-3 py-1 bg-gray-500 text-white text-sm rounded hover:bg-gray-600 transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            {/* 텍스트 표시 - 마크다운과 줄바꿈 적용 */}
                            <div
                              className="text-gray-800 leading-relaxed"
                              style={{
                                ...(!expandedPosts.has(post.id) && post.content.length > 200 && {
                                  display: '-webkit-box',
                                  WebkitLineClamp: 5,
                                  WebkitBoxOrient: 'vertical',
                                  overflow: 'hidden'
                                })
                              }}
                            >
                              {renderMarkdownText(post.content)}
                            </div>

                            {/* 태그 필터링 시 날짜 표시 */}
                            {selectedTags.length > 0 && post.date && (
                              <p className="text-xs text-gray-400 mt-1">
                                {new Date(post.date + 'T00:00:00').toLocaleDateString('ko-KR')}
                              </p>
                            )}
                          </div>
                          {user && (
                            <div className="ml-3 flex items-center gap-1">
                              <button
                                onClick={() => startEdit(post.id, post.content, post.images || [], post.date)}
                                className="p-1 text-gray-400 hover:text-blue-500 transition-colors"
                                title="수정"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(post.id, post.date)}
                                className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                                title="삭제"
                              >
                                <Trash className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </div>

                        {/* 이미지 표시 */}
                        {post.images && post.images.length > 0 && (
                          <div className="mt-3 w-full">
                            {expandedPosts.has(post.id) ? (
                              <div className="w-full">
                                {post.images.map((image, index) => (
                                  <div key={image.id} className="mb-4 w-full">
                                    <img
                                      src={image.data}
                                      alt={image.name}
                                      className="block w-auto max-w-none rounded border cursor-pointer hover:opacity-90 transition-opacity"
                                      style={{
                                        display: 'block',
                                        width: 'auto',
                                        height: 'auto',
                                        maxWidth: 'none',
                                        maxHeight: 'none'
                                      }}
                                      onClick={() => window.open(image.data, '_blank')}
                                    />
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="flex justify-center">
                                <div className="relative">
                                  <img
                                    src={post.images[0].data}
                                    alt={post.images[0].name}
                                    className="max-w-full h-48 object-cover rounded border cursor-pointer hover:opacity-90 transition-opacity"
                                    onClick={() => window.open(post.images[0].data, '_blank')}
                                  />
                                  {post.images.length > 1 && (
                                    <div className="absolute bottom-2 right-2 bg-black bg-opacity-60 text-white px-2 py-1 rounded text-xs">
                                      +{post.images.length - 1} more
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* 더보기/접기 버튼 */}
                        {shouldShowMoreButton(post) && (
                          <div className="mt-3">
                            <button
                              onClick={() => toggleExpandPost(post.id)}
                              className="text-sm text-gray-500 hover:text-black transition-colors"
                            >
                              {expandedPosts.has(post.id) ? '접기' : '더보기'}
                            </button>
                          </div>
                        )}

                        <div className="flex items-center justify-between mt-2">
                          <p className="text-xs text-gray-500">{post.createdAt}</p>
                          {post.author && (
                            <p className="text-xs text-gray-400">작성자: {post.author}</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default DiaryBoard;

