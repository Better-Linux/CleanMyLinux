use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;

/// Represents the input feature vector for the progress prediction model.
/// 
/// These features are extracted from the real-time stdout/stderr stream of an operation.
/// Numerical values are normalized to ensure stable dot-product calculations within the model.
#[derive(Debug, Clone)]
pub struct ProgressFeatures {
    /// Normalized time elapsed since the operation started.
    pub elapsed_sec: f32,
    /// Normalized count of lines emitted by the process.
    pub line_count: f32,
    /// Normalized count of characters emitted by the process.
    pub char_count: f32,
    /// Normalized length of the most recent line.
    pub latest_line_len: f32,
    /// A list of sanitized keywords extracted from the stream (e.g., "download", "unpack").
    pub active_keys: Vec<String>,
}

impl ProgressFeatures {
    /// Extracts and normalizes features from raw process output metrics.
    /// 
    /// - Normalizes numerical metrics to a manageable range (0-10).
    /// - Tokenizes the latest line to identify semantic keywords longer than 3 characters.
    pub fn extract(elapsed_sec: f32, line_count: usize, char_count: usize, latest_line: &str) -> Self {
        let mut active_keys = Vec::new();
        
        // Tokenize line into distinct clean candidate substring roots longer than 3 characters
        for word in latest_line.to_lowercase().split_whitespace() {
            let cleaned: String = word.chars().filter(|c| c.is_ascii_alphanumeric() || *c == '_').collect();
            if cleaned.len() > 3 {
                active_keys.push(cleaned);
            }
        }

        Self {
            elapsed_sec: (elapsed_sec / 300.0).min(5.0),
            // Clamped normalization keeping dot-product calculations highly stable
            line_count: (line_count as f32 / 100.0).min(10.0),
            char_count: (char_count as f32 / 5000.0).min(10.0),
            latest_line_len: (latest_line.len() as f32 / 80.0).min(5.0),
            active_keys,
        }
    }
}

/// Serializable representation of the model's weights for persistence.
#[derive(Debug, Serialize, Deserialize)]
pub struct ProgressModelWeights {
    /// Learned weights for specific semantic keywords found in the stream.
    pub feature_weights: HashMap<String, f32>,
    /// Weights for universal metrics: [time, line_count, char_count, line_length].
    pub base_weights: [f32; 4],
    /// The bias term (intercept) for the logistic regression.
    pub intercept: f32,
}

/// A Logistic Regression based model that predicts operation progress in real-time.
/// 
/// This model uses "Continual Learning" to adapt its predictions to the specific
/// behavior of the user's system and package manager. It starts with pre-trained baseline 
/// weights and refines them after every successful operation.
pub struct ProgressModel {
    pub feature_weights: HashMap<String, f32>,
    pub base_weights: [f32; 4],
    pub intercept: f32,
    pub learning_rate: f32,
}

impl ProgressModel {
    /// Initializes a new model, attempting to load custom learned weights first, 
    /// then falling back to embedded baseline assets, and finally a hardcoded default.
    pub fn new() -> Self {
        // Try to load personalized continual learning weights from ~/.config/cleanmylinux/progress_weights.json
        if let Some(loaded) = Self::load_custom_weights() {
            return Self {
                feature_weights: loaded.feature_weights,
                base_weights: loaded.base_weights,
                intercept: loaded.intercept,
                learning_rate: 0.01,
            };
        }

        // Load pre-trained offline baseline intelligence compiled directly from embedded multi-distro key maps
        let base_asset = include_str!("../../assets/progress_model_weights.json");
        if let Ok(base_weights) = serde_json::from_str::<ProgressModelWeights>(base_asset) {
            return Self {
                feature_weights: base_weights.feature_weights,
                base_weights: base_weights.base_weights,
                intercept: base_weights.intercept,
                learning_rate: 0.01,
            };
        }

        // Starter feature weight map assigning standard software operational milestones natively
        let mut default_features = HashMap::new();
        default_features.insert("download".to_string(), -0.4);
        default_features.insert("fetch".to_string(), -0.3);
        default_features.insert("get".to_string(), -0.3);
        default_features.insert("recv".to_string(), -0.2);
        default_features.insert("install".to_string(), 0.4);
        default_features.insert("unpack".to_string(), 0.3);
        default_features.insert("setting".to_string(), 0.3);
        default_features.insert("upgrading".to_string(), 0.3);
        default_features.insert("clean".to_string(), 0.5);
        default_features.insert("complete".to_string(), 1.2);
        default_features.insert("done".to_string(), 1.2);

        Self {
            feature_weights: default_features,
            base_weights: [12.0828, 0.1585, -0.0927, -0.2490],
            intercept: -1.4589,
            learning_rate: 0.01,
        }
    }

    /// Predicts the current completion percentage (0.05 to 0.95).
    /// 
    /// Calculations are performed using a standard Sigmoid activation function
    /// over the dot product of the feature vector and current weights.
    pub fn predict(&self, features: &ProgressFeatures) -> f32 {
        let mut dot = self.intercept;
        dot += features.elapsed_sec * self.base_weights[0];
        dot += features.line_count * self.base_weights[1];
        dot += features.char_count * self.base_weights[2];
        dot += features.latest_line_len * self.base_weights[3];

        for key in &features.active_keys {
            // If the synaptic connection already exists, add its learned weight!
            // Otherwise, its default contribution is 0.0 (neutral discovery state)
            if let Some(&w) = self.feature_weights.get(key) {
                dot += w;
            }
        }

        // Standard Sigmoid activation smoothly clamped between 0.05 and 0.95
        let p = 1.0 / (1.0 + (-dot).exp());
        p.clamp(0.05, 0.95)
    }

    /// Refines the model weights using Stochastic Gradient Descent (SGD) based 
    /// on the actual execution trace of a completed operation.
    /// 
    /// This is the "Learning" phase where the model compares its previous predictions
    /// against the ideal linear progress path and adjusts weights to minimize error.
    pub fn train_on_trace(&mut self, trace: &[(ProgressFeatures, f32)]) {
        if trace.is_empty() {
            return;
        }

        // Online Continual Learning Backpropagation pass via Stochastic Gradient Descent (SGD)
        for (feat, true_progress) in trace {
            let mut dot = self.intercept;
            dot += feat.elapsed_sec * self.base_weights[0];
            dot += feat.line_count * self.base_weights[1];
            dot += feat.char_count * self.base_weights[2];
            dot += feat.latest_line_len * self.base_weights[3];

            for key in &feat.active_keys {
                if let Some(&w) = self.feature_weights.get(key) {
                    dot += w;
                }
            }

            let pred = 1.0 / (1.0 + (-dot).exp());

            // Gradient calculation: error = prediction - actual
            let error = pred - true_progress;
            let d_sigmoid = pred * (1.0 - pred);
            let gradient_base = error * d_sigmoid;

            // Update universal base coefficients
            self.base_weights[0] -= self.learning_rate * gradient_base * feat.elapsed_sec;
            self.base_weights[1] -= self.learning_rate * gradient_base * feat.line_count;
            self.base_weights[2] -= self.learning_rate * gradient_base * feat.char_count;
            self.base_weights[3] -= self.learning_rate * gradient_base * feat.latest_line_len;
            self.intercept -= self.learning_rate * gradient_base;

            // Dynamically register new keys into our growing synaptic connection map!
            for key in &feat.active_keys {
                let entry = self.feature_weights.entry(key.clone()).or_insert(0.0);
                *entry -= self.learning_rate * gradient_base;
            }
        }

        // Persist local weight optimizations back to user configuration path
        Self::save_custom_weights(&self.feature_weights, &self.base_weights, self.intercept);
    }

    /// Returns the absolute path to the local progress weights configuration file.
    fn config_path() -> Option<PathBuf> {
        let base = std::env::var("XDG_CONFIG_HOME")
            .or_else(|_| std::env::var("HOME").map(|h| format!("{}/.config", h)))
            .ok()?;
            
        let mut path = PathBuf::from(base);
        path.push("cleanmylinux");
        path.push("progress_weights.json");
        Some(path)
    }

    /// Attempts to load customized weights from the user's config directory.
    fn load_custom_weights() -> Option<ProgressModelWeights> {
        let path = Self::config_path()?;
        if path.exists() {
            if let Ok(content) = fs::read_to_string(&path) {
                if let Ok(weights) = serde_json::from_str::<ProgressModelWeights>(&content) {
                    return Some(weights);
                }
            }
        }
        None
    }

    /// Saves the current learned weights to the user's config directory for future use.
    fn save_custom_weights(feature_weights: &HashMap<String, f32>, base_weights: &[f32; 4], intercept: f32) {
        if let Some(path) = Self::config_path() {
            if let Some(parent) = path.parent() {
                let _ = fs::create_dir_all(parent);
            }
            let payload = ProgressModelWeights {
                feature_weights: feature_weights.clone(),
                base_weights: *base_weights,
                intercept,
            };
            if let Ok(json) = serde_json::to_string_pretty(&payload) {
                let _ = fs::write(path, json);
            }
        }
    }
}
