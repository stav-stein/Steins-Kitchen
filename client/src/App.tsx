import { Routes, Route } from 'react-router-dom';
import { Shell } from './components/Shell';
import { Discover } from './pages/Discover';
import { Cookbook } from './pages/Cookbook';
import { AddRecipe } from './pages/AddRecipe';
import { RecipeDetailPage } from './pages/RecipeDetailPage';
import { EditRecipePage } from './pages/EditRecipePage';

// Pages that use the main shell (header + bottom nav)
function ShellRoutes() {
  return (
    <Shell>
      <Routes>
        <Route path="/" element={<Cookbook />} />
        <Route path="/cookbook" element={<Cookbook />} />
        <Route path="/discover" element={<Discover />} />
        <Route path="/add" element={<AddRecipe />} />
      </Routes>
    </Shell>
  );
}

export default function App() {
  return (
    <Routes>
      {/* Full-screen pages (no shell nav) */}
      <Route path="/recipe/:id" element={<RecipeDetailPage />} />
      <Route path="/edit/:id" element={<EditRecipePage />} />
      {/* Shell pages */}
      <Route path="/*" element={<ShellRoutes />} />
    </Routes>
  );
}
