#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{LogicalSize, Manager, Size, Window};

#[tauri::command]
fn resize_overlay(window: Window, width: f64, height: f64) {
    let _ = window.set_size(Size::Logical(LogicalSize { width, height }));
}

#[tauri::command]
fn set_click_through(window: Window, ignore: bool) {
    let _ = window.set_ignore_cursor_events(ignore);
}

#[tauri::command]
fn close_overlay(window: Window) {
    let _ = window.close();
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            resize_overlay,
            set_click_through,
            close_overlay
        ])
        .setup(|app| {
            if let Some(window) = app.get_window("main") {
                let _ = window.set_always_on_top(true);
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("Error al ejecutar la aplicacion Tauri");
}
