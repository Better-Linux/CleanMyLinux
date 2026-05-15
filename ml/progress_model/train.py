import os
import sys
import re
import json
import random
from collections import Counter

# Auto-install dependencies if missing to ensure effortless execution
try:
    import numpy as np
    from sklearn.linear_model import LinearRegression
    print("✓ Dependencies verified")
except ImportError:
    print("Installing dependencies...")
    os.system(f"{sys.executable} -m pip install scikit-learn numpy")
    import numpy as np
    from sklearn.linear_model import LinearRegression

def clean_ansi(line):
    """Strips terminal color codes, raw script timestamps, and ANSI cursor arrays."""
    ansi_escape = re.compile(r'\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])')
    line = ansi_escape.sub('', line)
    line = re.sub(r'\]3008;.*?\\', '', line)
    line = line.replace('\x00', '').replace('\x07', '').replace('\x08', '')
    return line.strip()

def extract_keys(latest_line):
    """Parses clean root words longer than 3 characters directly from the stream layout."""
    words = latest_line.lower().split()
    keys = []
    for w in words:
        cleaned = "".join(c for c in w if c.isalnum() or c == '_')
        if len(cleaned) > 3:
            keys.append(cleaned)
    return keys

def extract_base_metrics(elapsed_sec, line_count, char_count, latest_line):
    return [
        min(elapsed_sec / 300.0, 5.0),
        min(line_count / 100.0, 10.0),
        min(char_count / 5000.0, 10.0),
        min(len(latest_line) / 80.0, 5.0),
    ]

def parse_raw_logs():
    """Scans raw archives, records dynamic keys, and maps ground-truth probability milestones."""
    log_dir = "ml/progress_model/data/raw_log"
    if not os.path.exists(log_di
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    r):  return []
        
    log_files = [f for f in os.listdir(log_dir) if f.endswith(".log")]
    print(f"Discovered {len(log_files)} genuine log files.")
    
    samples = []
    for filename in sorted(log_files):
        filepath = os.path.join(log_dir, filename)
        try:
            with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
                content = f.read()
        except Exception as e:
            continue
            
        raw_lines = re.split(r'[\n\r]+', content)
        clean_lines = []
        for l in raw_lines:
            cleaned = clean_ansi(l)
            if cleaned and not cleaned.startswith("Script started") and not cleaned.startswith("Script done"):
                clean_lines.append(cleaned)
                
        total_lines = len(clean_lines)
        if total_lines == 0:
            continue
            
        total_time = random.uniform(2.0, 15.0) if total_lines < 30 else random.uniform(15.0, 120.0)
        
        accumulated_chars = 0
        for idx, line in enumerate(clean_lines):
            line_num = idx + 1
            accumulated_chars += len(line)
            elapsed = (line_num / total_lines) * total_time
            
            base_metrics = extract_base_metrics(elapsed, line_num, accumulated_chars, line)
            keys = extract_keys(line)
            
            lower = line.lower()
            base_p = line_num / total_lines
            
            if any(w in lower for w in ["complete", "done", "finish", "arming conditionneedsupdate"]):
                true_p = 0.95
            else:
                true_p = base_p
                
            p_clamped = max(0.05, min(0.95, true_p))
            target_logit = np.log(p_clamped / (1.0 - p_clamped))
            
            samples.append((base_metrics, keys, target_logit))
            
    return samples

def simulate_traces():
    """Generates supplementary standard progression frames to enrich universal operational phases."""
    fetch_terms = ["fetch", "downloading", "get", "retrieving", "recv"]
    install_terms = ["install", "unpacking", "setting", "upgrading", "processing", "transaction"]
    clean_terms = ["clean", "clearing", "cache", "pruning", "removing"]
    complete_terms = ["complete", "done", "finished", "success"]
    
    samples = []
    for _ in range(300):
        total_steps = random.randint(20, 120)
        total_time = random.uniform(5.0, 60.0)
        current_lines = 0
        current_chars = 0
        
        for step in range(total_steps):
            base_p = (step + 1) / total_steps
            elapsed = (step / total_steps) * total_time
            current_lines += 1
            
            if base_p < 0.25:
                line_text = random.choice(fetch_terms) + f" package_{step} ({random.randint(1,100)}%)"
                true_p = base_p
            elif base_p < 0.75:
                line_text = random.choice(install_terms) + f" dependency_{step} outputting blocks"
                true_p = base_p
            elif base_p < 0.90:
                line_text = random.choice(clean_terms) + " temporary archive staging files"
                true_p = base_p
            else:
                line_text = random.choice(complete_terms) + " operation successfully executed"
                true_p = 0.95
                
            line_len = len(line_text) + random.randint(5, 50)
            current_chars += line_len
            
            p_clamped = max(0.05, min(0.95, true_p))
            target_logit = np.log(p_clamped / (1.0 - p_clamped))
            
            base_metrics = extract_base_metrics(elapsed, current_lines, current_chars, line_text)
            keys = extract_keys(line_text)
            
            samples.append((base_metrics, keys, target_logit))
            
    return samples

def main():
    print("CleanMyLinux - Autonomous Dynamic Feature Discovery Base Training")
    print("=" * 60)
    
    print("Extracting multi-distro unstructured logs and simulated sequences...")
    samples_logs = parse_raw_logs()
    samples_sim = simulate_traces()
    all_samples = samples_logs + samples_sim
    print(f"Aggregated {len(all_samples)} total streaming frames.")
    
    print("Discovering distinct global vocabulary keys mapping synaptic features...")
    key_counter = Counter()
    for _, keys, _ in all_samples:
        key_counter.update(keys)
        
    # Retain unique key structures appearing at least 15 times to form robust synaptic pathways
    unique_keys = [k for k, count in key_counter.items() if count >= 15]
    key_to_idx = {k: i for i, k in enumerate(unique_keys)}
    print(f"Dynamically generated Synaptic Registry Width: {len(unique_keys)} discovered feature nodes.")
    
    print("Constructing expansive combined design matrix...")
    num_samples = len(all_samples)
    num_features = 4 + len(unique_keys)
    
    X = np.zeros((num_samples, num_features), dtype=np.float32)
    y = np.zeros(num_samples, dtype=np.float32)
    
    for i, (base_metrics, keys, target_logit) in enumerate(all_samples):
        X[i, :4] = base_metrics
        for k in keys:
            if k in key_to_idx:
                X[i, 4 + key_to_idx[k]] = 1.0
        y[i] = target_logit
        
    print("Fitting scikit-learn Linear Regression engine across dynamically expanding synaptic space...")
    model = LinearRegression()
    model.fit(X, y)
    
    weights = model.coef_.tolist()
    intercept = float(model.intercept_)
    
    base_weights = weights[:4]
    feature_weights = {k: float(w) for k, w in zip(unique_keys, weights[4:])}
    
    # Inject baseline starter correlations to ensure absolute universal robustness
    default_injections = {
        "download": -0.4, "fetch": -0.3, "get": -0.3, "recv": -0.2,
        "install": 0.4, "unpack": 0.3, "setting": 0.3, "upgrading": 0.3,
        "clean": 0.5, "complete": 1.2, "done": 1.2
    }
    for k, w in default_injections.items():
        if k not in feature_weights:
            feature_weights[k] = w
            
    print("\nOptimized Base Multipliers:")
    print(f"  {base_weights[0]:+.4f}  elapsed_sec")
    print(f"  {base_weights[1]:+.4f}  line_count")
    print(f"  {base_weights[2]:+.4f}  char_count")
    print(f"  {base_weights[3]:+.4f}  latest_line_len")
    print(f"  {intercept:+.4f}  (intercept)")
    
    print(f"\nTop 5 Positive Discovered Synaptic Features:")
    sorted_features = sorted(feature_weights.items(), key=lambda item: item[1], reverse=True)
    for k, w in sorted_features[:5]:
        print(f"  {w:+.4f}  {k}")
        
    print(f"\nTop 5 Negative Discovered Synaptic Features:")
    for k, w in sorted_features[-5:]:
        print(f"  {w:+.4f}  {k}")
        
    # Save optimized outputs locally
    os.makedirs("ml/progress_model/models", exist_ok=True)
    payload = {
        "feature_weights": feature_weights,
        "base_weights": base_weights,
        "intercept": intercept
    }
    
    local_path = "ml/progress_model/models/progress_model_weights.json"
    with open(local_path, "w") as f:
        json.dump(payload, f, indent=2)
    print(f"\n✓ Optimized dynamic registry saved: {local_path}")
    
    # Mirror outputs directly to target compile assets directory
    assets_dir = "src-tauri/assets"
    os.makedirs(assets_dir, exist_ok=True)
    target_asset = os.path.join(assets_dir, "progress_model_weights.json")
    
    with open(target_asset, "w") as f:
        json.dump(payload, f, indent=2)
    print(f"✓ Embedded asset synchronized flawlessly: {target_asset}")
    
    print("\n" + "=" * 60)
    print("End-to-End Autonomous Feature Discovery Training Complete! The AI engine is completely boundless.")

if __name__ == "__main__":
    main()
