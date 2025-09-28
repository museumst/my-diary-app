// src/services/firestoreService.js
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../firebase';

// 사용자별 일기 데이터 경로: users/{userId}/posts/{date}
// 각 날짜별로 문서 하나, 그 안에 posts 배열로 여러 글 저장

// 일기 추가 함수 수정 (imageUrl 인자 추가)
export const addPostToDate = async (userId, date, content, imageUrl = null) => {
    try {
        const docRef = doc(db, 'users', userId, 'posts', date);
        
        // 기존 데이터를 가져와서 새로운 데이터와 병합 (배열에 새 일기 추가)
        // 이 부분은 사용자님의 기존 데이터 구조에 따라 달라질 수 있습니다.
        const newPost = {
            id: Date.now(),
            content: content,
            imageUrl: imageUrl, // 🚨 이미지 URL 저장 필드 추가
            createdAt: new Date()
        };
        
        // Firestore에 데이터 저장 (기존 배열에 추가하는 로직)
        // ...
        
    } catch (error) {
        console.error("Error adding post:", error);
        throw error;
    }
};

// 특정 날짜의 일기 데이터 가져오기
export const getPostsForDate = async (userId, date) => {
  try {
    const docRef = doc(db, 'users', userId, 'posts', date);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return docSnap.data().posts || [];
    } else {
      return [];
    }
  } catch (error) {
    console.error('Error getting posts for date:', error);
    throw error;
  }
};

// 특정 날짜에 새 글 추가
export const addPostToDate = async (userId, date, post) => {
  try {
    const docRef = doc(db, 'users', userId, 'posts', date);
    const docSnap = await getDoc(docRef);
    
    let posts = [];
    if (docSnap.exists()) {
      posts = docSnap.data().posts || [];
    }
    
    posts.push(post);
    
    await setDoc(docRef, { posts }, { merge: true });
    return post;
  } catch (error) {
    console.error('Error adding post:', error);
    throw error;
  }
};

// 특정 날짜의 글 수정
export const updatePostInDate = async (userId, date, postId, updatedPost) => {
  try {
    const docRef = doc(db, 'users', userId, 'posts', date);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      let posts = docSnap.data().posts || [];
      const postIndex = posts.findIndex(post => post.id === postId);
      
      if (postIndex !== -1) {
        posts[postIndex] = { ...posts[postIndex], ...updatedPost };
        await updateDoc(docRef, { posts });
        return posts[postIndex];
      }
    }
    throw new Error('Post not found');
  } catch (error) {
    console.error('Error updating post:', error);
    throw error;
  }
};

// 특정 날짜의 글 삭제
export const deletePostFromDate = async (userId, date, postId) => {
  try {
    const docRef = doc(db, 'users', userId, 'posts', date);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      let posts = docSnap.data().posts || [];
      posts = posts.filter(post => post.id !== postId);
      
      if (posts.length === 0) {
        await deleteDoc(docRef);
      } else {
        await updateDoc(docRef, { posts });
      }
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error deleting post:', error);
    throw error;
  }
};

// 사용자의 모든 일기 데이터 가져오기 (실시간 리스너)
export const subscribeToUserPosts = (userId, callback) => {
  const postsRef = collection(db, 'users', userId, 'posts');
  
  return onSnapshot(postsRef, (snapshot) => {
    const allPosts = {};
    snapshot.forEach((doc) => {
      allPosts[doc.id] = doc.data().posts || [];
    });
    callback(allPosts);
  }, (error) => {
    console.error('Error listening to posts:', error);
    callback({});
  });
};

// 해시태그로 검색
export const searchPostsByHashtag = async (userId, hashtag) => {
  try {
    const postsRef = collection(db, 'users', userId, 'posts');
    const snapshot = await getDocs(postsRef);
    
    const matchingPosts = [];
    snapshot.forEach((doc) => {
      const posts = doc.data().posts || [];
      posts.forEach(post => {
        if (post.content.includes(hashtag)) {
          matchingPosts.push({
            ...post,
            date: doc.id
          });
        }
      });
    });
    
    return matchingPosts;
  } catch (error) {
    console.error('Error searching posts:', error);
    throw error;
  }
};
