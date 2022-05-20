

bindgen:
	WASM32=1 cargo +nightly build --target wasm32-unknown-unknown
	@mkdir pkg 2> /dev/null || true
	wasm-bindgen target/wasm32-unknown-unknown/debug/mywasm.wasm --typescript --out-dir pkg/


wasm:
	#RUST_LOG=error WASM32=1 wasm-pack build --dev
	WASM32=1 wasm-pack build --dev

install:
	curl https://sh.rustup.rs -sSf | sh
	rustup toolchain install nightly
	rustup target add wasm32-unknown-unknown --toolchain nightly
	cargo +nightly install wasm-bindgen-cli
	curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh


run:
	@cargo run

# npm install -g prettier
# cargo install bat
view:
	@prettier pkg/mywasm.d.ts --parser typescript | bat -l typescript

.PHONY: view install wasm bindgen
