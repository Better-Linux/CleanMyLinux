use super::features::AppFeatures;
use std::sync::OnceLock;

/// Logistic regression weights loaded from embedded JSON at first use.
struct LrWeights {
    coef: Vec<f32>,
    intercept: f32,
    scaler_mean: Vec<f32>,
    scaler_scale: Vec<f32>,
    #[allow(dead_code)]
    threshold: f32,
}

/// Embedded model weights compiled directly into the binary.
/// Regenerate by running: python3 ml/train.py
static WEIGHTS_JSON: &str = include_str!("../../assets/app_classifier_weights.json");
static WEIGHTS: OnceLock<LrWeights> = OnceLock::new();

fn load_weights() -> &'static LrWeights {
    WEIGHTS.get_or_init(|| {
        let v: serde_json::Value = serde_json::from_str(WEIGHTS_JSON)
            .expect("Failed to parse app_classifier_weights.json");

        let coef = v["coef"].as_array().unwrap()
            .iter().map(|x| x.as_f64().unwrap() as f32).collect();
        let intercept = v["intercept"].as_f64().unwrap() as f32;
        let scaler_mean = v["scaler_mean"].as_array().unwrap()
            .iter().map(|x| x.as_f64().unwrap() as f32).collect();
        let scaler_scale = v["scaler_scale"].as_array().unwrap()
            .iter().map(|x| x.as_f64().unwrap_or(1.0) as f32).collect();
        let threshold = v["threshold"].as_f64().unwrap_or(0.5) as f32;

        LrWeights { coef, intercept, scaler_mean, scaler_scale, threshold }
    })
}

/// App Classifier using a trained logistic regression model.
/// Falls back to rule-based scoring if weights file is missing/corrupt.
pub struct AppClassifier;

impl AppClassifier {
    pub fn new() -> Self { Self }

    /// Returns probability 0.0–1.0 that this is a user-facing app.
    pub fn predict(&self, features: &AppFeatures) -> f32 {
        let feat_vec = features.to_vec();

        // Try ML model first
        if let Ok(score) = self.ml_predict(&feat_vec) {
            return score;
        }

        // Fallback: fast rule-based scorer (used before training runs)
        self.rule_predict(features)
    }

    fn ml_predict(&self, feat_vec: &[f32]) -> Result<f32, ()> {
        let w = load_weights();
        if w.coef.len() != feat_vec.len() {
            return Err(());
        }
        // Scale features: (x - mean) / scale
        let scaled: Vec<f32> = feat_vec.iter().zip(&w.scaler_mean).zip(&w.scaler_scale)
            .map(|((x, m), s)| (x - m) / s.max(1e-7))
            .collect();
        // Dot product + intercept
        let logit: f32 = scaled.iter().zip(&w.coef).map(|(x, c)| x * c).sum::<f32>() + w.intercept;
        // Sigmoid
        Ok(1.0 / (1.0 + (-logit).exp()))
    }

    fn rule_predict(&self, f: &AppFeatures) -> f32 {
        // Strong positive: flatpak/snap always user apps
        if f.is_flatpak > 0.5 || f.is_snap > 0.5 { return 0.95; }
        
        // Behavioral Strong Negatives (System DNA)
        if f.has_polkit_policy > 0.5 { return 0.01; } // High confidence system tool
        if f.has_systemd_service > 0.5 { return 0.05; }
        if f.has_etc_config > 0.5 && f.is_user_installed < 0.5 { return 0.05; }
        if f.vendor_is_distro > 0.5 && f.is_user_installed < 0.5 { return 0.1; }

        // Strong negatives by name
        if f.name_starts_lib > 0.5 { return 0.05; }
        if f.name_starts_python > 0.5 || f.name_starts_perl > 0.5 { return 0.05; }
        if f.name_ends_dev > 0.5 || f.name_ends_doc > 0.5 || f.name_ends_dbg > 0.5 { return 0.05; }
        if f.desc_has_library > 0.5 || f.desc_has_module > 0.5 { return 0.1; }

        // Positive signals
        if f.has_desktop_file > 0.5 && f.has_icon > 0.5 && f.has_exec > 0.5 { 
            // Even if it has a GUI, if it's a distro-provided system tool, lower its user-app score
            if f.vendor_is_distro > 0.5 && f.is_user_installed < 0.5 {
                return 0.4; // Uncertain, likely system utility
            }
            return 0.9; 
        }
        if f.has_gui_category > 0.5 { return 0.8; }
        0.5
    }

    #[allow(dead_code)]
    pub fn is_user_app(&self, features: &AppFeatures) -> bool {
        let w = load_weights();
        self.predict(features) >= w.threshold
    }
}