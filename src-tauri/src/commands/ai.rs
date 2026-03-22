use std::time::Duration;

use reqwest::Client;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};

const DEFAULT_AI_BASE_URL: &str = "https://api.groq.com/openai/v1";
const DEFAULT_AI_MODEL: &str = "llama-3.1-8b-instant";

#[derive(Debug, Deserialize, Serialize)]
pub struct AiMessageInput {
    pub role: String,
    pub content: String,
}

#[derive(Debug, Deserialize)]
struct ChatCompletionResponse {
    choices: Vec<ChatChoice>,
}

#[derive(Debug, Deserialize)]
struct ChatChoice {
    message: ChatMessage,
}

#[derive(Debug, Deserialize)]
struct ChatMessage {
    content: Value,
}

fn extract_message_content(value: &Value) -> Option<String> {
    match value {
        Value::String(text) => Some(text.trim().to_string()),
        Value::Array(parts) => {
            let text = parts
                .iter()
                .filter_map(|part| {
                    let object = part.as_object()?;
                    if object.get("type")?.as_str()? != "text" {
                        return None;
                    }

                    object.get("text")?.as_str().map(str::to_string)
                })
                .collect::<Vec<_>>()
                .join("\n");

            if text.trim().is_empty() {
                None
            } else {
                Some(text.trim().to_string())
            }
        }
        _ => None,
    }
}

fn parse_error_message(body: &str) -> String {
    serde_json::from_str::<Value>(body)
        .ok()
        .and_then(|payload| {
            payload
                .get("error")
                .and_then(|error| error.get("message").or_else(|| error.get("error")))
                .and_then(Value::as_str)
                .map(str::to_string)
                .or_else(|| {
                    payload
                        .get("message")
                        .and_then(Value::as_str)
                        .map(str::to_string)
                })
        })
        .filter(|message| !message.trim().is_empty())
        .unwrap_or_else(|| body.trim().to_string())
}

#[tauri::command]
pub async fn ai_chat(
    api_key: String,
    base_url: Option<String>,
    model: Option<String>,
    messages: Vec<AiMessageInput>,
) -> Result<String, String> {
    let trimmed_key = api_key.trim();
    if trimmed_key.is_empty() {
        return Err("Configure uma chave de API nas integrações para usar a IA.".into());
    }

    let filtered_messages = messages
        .into_iter()
        .filter_map(|message| {
            let role = message.role.trim().to_string();
            let content = message.content.trim().to_string();

            if role.is_empty() || content.is_empty() {
                None
            } else {
                Some(AiMessageInput { role, content })
            }
        })
        .collect::<Vec<_>>();

    if filtered_messages.is_empty() {
        return Err("Nenhuma mensagem foi enviada para a IA.".into());
    }

    let resolved_base_url = base_url
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .unwrap_or(DEFAULT_AI_BASE_URL)
        .trim_end_matches('/')
        .to_string();
    let resolved_model = model
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .unwrap_or(DEFAULT_AI_MODEL)
        .to_string();

    let client = Client::builder()
        .timeout(Duration::from_secs(45))
        .build()
        .map_err(|error| format!("Não foi possível iniciar o cliente HTTP da IA: {error}"))?;

    let response = client
        .post(format!("{resolved_base_url}/chat/completions"))
        .bearer_auth(trimmed_key)
        .header("Content-Type", "application/json")
        .json(&json!({
            "model": resolved_model,
            "temperature": 0.35,
            "stream": false,
            "messages": filtered_messages,
        }))
        .send()
        .await
        .map_err(|error| format!("Falha ao consultar a IA: {error}"))?;

    let status = response.status();
    let body = response
        .text()
        .await
        .map_err(|error| format!("Falha ao ler a resposta da IA: {error}"))?;

    if !status.is_success() {
        return Err(parse_error_message(&body));
    }

    let payload = serde_json::from_str::<ChatCompletionResponse>(&body)
        .map_err(|error| format!("Falha ao processar a resposta da IA: {error}"))?;
    let content = payload
        .choices
        .first()
        .and_then(|choice| extract_message_content(&choice.message.content))
        .filter(|value| !value.trim().is_empty())
        .ok_or_else(|| "A IA respondeu sem conteúdo útil.".to_string())?;

    Ok(content)
}
