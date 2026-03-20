use std::sync::{
    atomic::{AtomicUsize, Ordering},
    Arc, Mutex,
};

use tauri::{AppHandle, Emitter, State};
use tauri_plugin_updater::UpdaterExt;

#[derive(Default)]
pub struct UpdateCache(pub Mutex<Option<CachedUpdate>>);

pub struct CachedUpdate {
    pub version: String,
    pub bytes: Vec<u8>,
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct UpdateInfo {
    pub version: String,
    pub body: Option<String>,
    pub date: Option<String>,
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct UpdateDownloadProgress {
    pub downloaded: usize,
    pub total: Option<u64>,
    pub progress: u8,
}

#[tauri::command]
pub async fn check_for_update(app: AppHandle) -> Result<Option<UpdateInfo>, String> {
    let updater = app.updater().map_err(|error| error.to_string())?;

    match updater.check().await {
        Ok(Some(update)) => Ok(Some(UpdateInfo {
            version: update.version.to_string(),
            body: update.body.clone(),
            date: update.date.map(|value| value.to_string()),
        })),
        Ok(None) => Ok(None),
        Err(error) => {
            eprintln!("Update check failed: {error}");
            Ok(None)
        }
    }
}

#[tauri::command]
pub async fn download_update(
    app: AppHandle,
    cache: State<'_, UpdateCache>,
) -> Result<UpdateInfo, String> {
    let updater = app.updater().map_err(|error| error.to_string())?;
    let update = updater
        .check()
        .await
        .map_err(|error| error.to_string())?
        .ok_or_else(|| "Nenhuma atualização disponível.".to_string())?;

    let version = update.version.to_string();
    let info = UpdateInfo {
        version: version.clone(),
        body: update.body.clone(),
        date: update.date.map(|value| value.to_string()),
    };

    let downloaded = Arc::new(AtomicUsize::new(0));
    let progress_downloaded = downloaded.clone();
    let finish_downloaded = downloaded.clone();
    let bytes = update
        .download(
            |chunk_length, content_length| {
                let downloaded =
                    progress_downloaded.fetch_add(chunk_length, Ordering::Relaxed) + chunk_length;
                let progress = content_length
                    .map(|total| {
                        ((downloaded as f64 / total as f64) * 100.0)
                            .round()
                            .clamp(0.0, 100.0) as u8
                    })
                    .unwrap_or(0);

                let _ = app.emit(
                    "tauri://update-download-progress",
                    UpdateDownloadProgress {
                        downloaded,
                        total: content_length,
                        progress,
                    },
                );
            },
            || {
                let downloaded = finish_downloaded.load(Ordering::Relaxed);
                let _ = app.emit(
                    "tauri://update-download-progress",
                    UpdateDownloadProgress {
                        downloaded,
                        total: Some(downloaded as u64),
                        progress: 100,
                    },
                );
            },
        )
        .await
        .map_err(|error| error.to_string())?;

    let mut guard = cache.0.lock().map_err(|error| error.to_string())?;
    *guard = Some(CachedUpdate { version, bytes });

    Ok(info)
}

#[tauri::command]
pub async fn install_update(
    app: AppHandle,
    cache: State<'_, UpdateCache>,
) -> Result<(), String> {
    let cached = {
        let mut guard = cache.0.lock().map_err(|error| error.to_string())?;
        guard.take()
    }
    .ok_or_else(|| "Nenhuma atualização baixada.".to_string())?;

    let updater = app.updater().map_err(|error| error.to_string())?;
    let update = updater
        .check()
        .await
        .map_err(|error| error.to_string())?
        .ok_or_else(|| "Nenhuma atualização disponível.".to_string())?;

    if update.version.to_string() != cached.version {
        return Err("A atualização disponível mudou. Baixe novamente.".into());
    }

    update
        .install(cached.bytes)
        .map_err(|error| error.to_string())?;

    app.request_restart();

    Ok(())
}
