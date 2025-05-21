import sys
import json
import numpy as np
from sklearn.preprocessing import StandardScaler
from sklearn.manifold import TSNE
from sklearn.cluster import KMeans

def load_data(input_data):
    print("Loading user preference data...")
    data = json.loads(input_data)
    print(f"Loaded data for {len(data)} users")
    return data

def prepare_features(data):
    print("Preparing features for clustering...")
    # Extract preference vectors
    preferences = np.array([user['preferences'] for user in data])
    
    # Standardize features
    scaler = StandardScaler()
    scaled_preferences = scaler.fit_transform(preferences)
    
    return scaled_preferences, data

def apply_clustering(preferences, n_clusters=5):
    print("Applying t-SNE dimensionality reduction...")
    # Apply t-SNE
    tsne = TSNE(n_components=2, random_state=42)
    reduced_data = tsne.fit_transform(preferences)
    
    print("Applying k-means clustering...")
    # Apply k-means clustering
    kmeans = KMeans(n_clusters=n_clusters, random_state=42)
    clusters = kmeans.fit_predict(preferences)
    
    return reduced_data, clusters

def main():
    try:
        if len(sys.argv) != 2:
            print("Usage: python user_clustering.py <input_data>")
            sys.exit(1)

        input_data = sys.argv[1]
        
        # Load and prepare data
        data = load_data(input_data)
        preferences, original_data = prepare_features(data)
        
        # Apply clustering
        reduced_data, clusters = apply_clustering(preferences)
        
        # Prepare result
        result = []
        for i, (user, coords, cluster) in enumerate(zip(original_data, reduced_data, clusters)):
            result.append({
                'userId': user['userId'],
                'x': float(coords[0]),
                'y': float(coords[1]),
                'cluster': int(cluster),
                'sampleRatings': user['sampleRatings']
            })
        
        # Output result as JSON
        print(json.dumps(result))
        
    except Exception as e:
        print(f"Error: {str(e)}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main() 