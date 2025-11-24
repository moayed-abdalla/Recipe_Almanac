export default function AlmanacPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-8">My Almanac</h1>
      
      {/* Filter Categories */}
      <div className="mb-6 flex flex-wrap gap-4">
        <div className="form-control">
          <label className="label">
            <span className="label-text">Filter by:</span>
          </label>
          <select className="select select-bordered">
            <option>My Recipes</option>
            <option>Saved Recipes</option>
          </select>
        </div>
        
        <div className="form-control">
          <label className="label">
            <span className="label-text">Category:</span>
          </label>
          <select className="select select-bordered">
            <option>All Categories</option>
            {/* Categories will be populated from recipe tags */}
          </select>
        </div>
      </div>

      {/* Recipe List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Recipes will be rendered here */}
      </div>
    </div>
  );
}

