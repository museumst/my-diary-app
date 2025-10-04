import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import DiaryBoard from './DiaryBoard';
import PostView from './PostView';
import './App.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<DiaryBoard />} />
        <Route path="/post/:date/:postId" element={<PostView />} />
      </Routes>
    </Router>
  );
}

export default App;
