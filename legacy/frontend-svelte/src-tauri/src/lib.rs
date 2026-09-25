use std::sync::Mutex;

mod models;
mod commands;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(commands::AuthState {
            user: Mutex::new(None),
        })
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            commands::login,
            commands::register,
            commands::logout,
            commands::restore_session,
            commands::get_current_user,
            commands::is_authenticated,
            commands::resend_verification,
            commands::get_jobs,
            commands::get_job,
            commands::create_job,
            commands::start_job,
            commands::cancel_job,
            commands::delete_job,
            commands::get_server_status,
            commands::get_available_models,
            commands::chat_with_model,
            commands::get_collections,
            commands::get_collection,
            commands::create_collection,
            commands::delete_collection,
            commands::upload_document,
            commands::query_rag,
            commands::get_teams,
            commands::create_team,
            commands::invite_to_team,
            commands::get_team_members,
            commands::remove_member,
            commands::get_theme,
            commands::set_theme,
            commands::toggle_theme,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
