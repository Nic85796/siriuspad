use std::cmp::Ordering;

use fuzzy_matcher::{skim::SkimMatcherV2, FuzzyMatcher};

use crate::{
    models::SearchResult,
    storage::{build_excerpt, load_all_notes},
};

fn excerpt_for_query(content: &str, query: &str) -> String {
    let lowercase_content = content.to_lowercase();
    let lowercase_query = query.to_lowercase();

    if let Some(position) = lowercase_content.find(&lowercase_query) {
        let start = position.saturating_sub(60);
        let end = usize::min(position + lowercase_query.len() + 90, content.len());
        let slice = content.get(start..end).unwrap_or(content);
        return build_excerpt(slice);
    }

    build_excerpt(content)
}

#[tauri::command]
pub fn search_notes(query: String) -> Result<Vec<SearchResult>, String> {
    let trimmed = query.trim();
    if trimmed.is_empty() {
        return Ok(Vec::new());
    }

    let matcher = SkimMatcherV2::default().ignore_case();
    let lowercase_query = trimmed.to_lowercase();
    let mut results = load_all_notes()?
        .into_iter()
        .filter_map(|note| {
            let title_score = matcher.fuzzy_match(&note.title, trimmed).unwrap_or(0);
            let content_score = matcher.fuzzy_match(&note.content, trimmed).unwrap_or(0);

            let exact_title = note.title.to_lowercase().contains(&lowercase_query);
            let exact_content = note.content.to_lowercase().contains(&lowercase_query);

            if title_score == 0 && content_score == 0 && !exact_title && !exact_content {
                return None;
            }

            let score = title_score as f32 * 1.8
                + content_score as f32 * 0.35
                + if exact_title { 80.0 } else { 0.0 }
                + if exact_content { 35.0 } else { 0.0 };

            Some(SearchResult {
                note_id: note.id,
                title: note.title,
                excerpt: excerpt_for_query(&note.content, trimmed),
                score,
            })
        })
        .collect::<Vec<_>>();

    results.sort_by(|left, right| {
        right
            .score
            .partial_cmp(&left.score)
            .unwrap_or(Ordering::Equal)
    });
    results.truncate(30);

    Ok(results)
}
