import sys
import json
import numpy as np
from sklearn.preprocessing import StandardScaler
from sklearn.decomposition import PCA
from sklearn.manifold import MDS, TSNE

# Try to import UMAP, but don't fail if it's not available
try:
    import umap
    UMAP_AVAILABLE = True
    print("UMAP is available")
except ImportError as e:
    UMAP_AVAILABLE = False
    print(f"UMAP is not available: {str(e)}")

def load_data(input_file):
    print(f"Loading data from {input_file}")
    try:
        with open(input_file, 'r') as f:
            data = json.load(f)
        print(f"Successfully loaded {len(data)} movies")
        return data
    except Exception as e:
        print(f"Error loading data: {str(e)}")
        raise

def save_result(result, output_file):
    print(f"Saving result to {output_file}")
    try:
        with open(output_file, 'w') as f:
            json.dump(result, f)
        print("Successfully saved result")
    except Exception as e:
        print(f"Error saving result: {str(e)}")
        raise

def prepare_features(movies):
    print("Preparing features")
    try:
        # Extract numerical features
        features = []
        for movie in movies:
            feature_vector = [
                movie['year'],
                movie['rating'],
                # Add more features as needed
            ]
            features.append(feature_vector)
        features_array = np.array(features)
        print(f"Prepared {len(features_array)} feature vectors")
        return features_array
    except Exception as e:
        print(f"Error preparing features: {str(e)}")
        raise

def apply_dimensionality_reduction(technique, features):
    print(f"Applying {technique} dimensionality reduction")
    try:
        # Standardize the features
        scaler = StandardScaler()
        features_scaled = scaler.fit_transform(features)
        print("Features standardized")

        if technique == 'pca':
            reducer = PCA(n_components=2)
        elif technique == 'mds':
            reducer = MDS(n_components=2, random_state=42)
        elif technique == 'tsne':
            reducer = TSNE(n_components=2, random_state=42)
        elif technique == 'umap':
            if not UMAP_AVAILABLE:
                print("Warning: UMAP is not available, falling back to PCA")
                reducer = PCA(n_components=2)
            else:
                reducer = umap.UMAP(n_components=2, random_state=42)
        else:
            raise ValueError(f"Unknown technique: {technique}")

        # Apply dimensionality reduction
        reduced_features = reducer.fit_transform(features_scaled)
        print(f"Successfully applied {technique}")
        return reduced_features
    except Exception as e:
        print(f"Error in dimensionality reduction: {str(e)}")
        raise

def main():
    try:
        if len(sys.argv) != 4:
            print("Usage: python dimensionality_reduction.py <technique> <input_file> <output_file>")
            sys.exit(1)

        technique = sys.argv[1]
        input_file = sys.argv[2]
        output_file = sys.argv[3]

        print(f"Starting dimensionality reduction with technique: {technique}")
        print(f"Input file: {input_file}")
        print(f"Output file: {output_file}")

        # Load the data
        movies = load_data(input_file)
        
        # Prepare features
        features = prepare_features(movies)
        
        # Apply dimensionality reduction
        reduced_features = apply_dimensionality_reduction(technique, features)
        
        # Prepare the result
        result = {
            'points': [],
            'metadata': {
                'technique': technique if technique != 'umap' or UMAP_AVAILABLE else 'pca (fallback)',
                'startYear': min(movie['year'] for movie in movies),
                'endYear': max(movie['year'] for movie in movies),
                'totalPoints': len(movies)
            }
        }
        
        # Add points with their metadata
        for i, movie in enumerate(movies):
            result['points'].append({
                'x': float(reduced_features[i, 0]),
                'y': float(reduced_features[i, 1]),
                'id': movie['id'],
                'title': movie['title'],
                'year': movie['year'],
                'rating': movie['rating'],
                'country': movie['country'],
                'genres': movie['genres']
            })
        
        # Save the result
        save_result(result, output_file)
        print("Dimensionality reduction completed successfully")
        
    except Exception as e:
        print(f"Error in main: {str(e)}")
        sys.exit(1)

if __name__ == '__main__':
    main() 