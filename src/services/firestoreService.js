// src/services/firestoreService.js
import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy
} from 'firebase/firestore';
import { db } from '../firebase';

// 공개 블로그: 각 글이 독립된 문서
// 구조: posts/{postId} (사용자 구분 없음)

// 글 추가
export const addPostToDate = async (date, post) => {
  try {
    const postRef = doc(db, 'posts', post.id);
    await setDoc(postRef, {
      ...post,
      date,
      createdAt: new Date().toISOString()
    });
    return post;
  } catch (error) {
    console.error('Error adding post:', error);
    throw error;
  }
};

// 글 수정
export const updatePostInDate = async (date, postId, updatedPost) => {
  try {
    const postRef = doc(db, 'posts', postId);
    await updateDoc(postRef, {
      ...updatedPost,
      updatedAt: new Date().toISOString()
    });
    return true;
  } catch (error) {
    console.error('Error updating post:', error);
    throw error;
  }
};

// 글 삭제
export const deletePostFromDate = async (date, postId) => {
  try {
    const postRef = doc(db, 'posts', postId);
    await deleteDoc(postRef);
    return true;
  } catch (error) {
    console.error('Error deleting post:', error);
    throw error;
  }
};

// 모든 글 구독 (실시간)
export const subscribeToAllPosts = (callback) => {
  const postsRef = collection(db, 'posts');
  const q = query(postsRef, orderBy('date', 'desc'));
  
  return onSnapshot(q, (snapshot) => {
    const allPosts = {};
    snapshot.forEach((doc) => {
      const postData = doc.data();
      const date = postData.date;
      
      if (!allPosts[date]) {
        allPosts[date] = [];
      }
      allPosts[date].push({ id: doc.id, ...postData });
    });
    callback(allPosts);
  }, (error) => {
    console.error('Error listening to posts:', error);
    callback({});
  });
};